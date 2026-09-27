// C Store Workers — OTP issue/verify (hashed codes, 10-min expiry, 5 attempts,
// 60-second resend cooldown). Same rules as the Node edition.
import { q, sha256Hex } from './lib.js';

export async function issueCode(c, userId, channel) {
  const now = Date.now();
  const row = await q.first(c, 'SELECT * FROM otp_codes WHERE user_id = ? AND channel = ?', userId, channel);
  if (row) {
    const last = Date.parse(row.last_sent_at + 'Z');
    if (Number.isFinite(last) && now - last < 60_000) {
      return { sent: false, reason: 'Please wait a minute before requesting a new code.' };
    }
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await q.run(c, 'DELETE FROM otp_codes WHERE user_id = ? AND channel = ?', userId, channel);
  await q.run(
    c,
    `INSERT INTO otp_codes(user_id, channel, code_hash, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, datetime('now', '+10 minutes'), 0, datetime('now'))`,
    userId, channel, await sha256Hex(code)
  );
  return { sent: true, code };
}

export async function verifyCode(c, userId, channel, input) {
  const row = await q.first(c, 'SELECT * FROM otp_codes WHERE user_id = ? AND channel = ?', userId, channel);
  if (!row) return { ok: false, reason: 'No code found — please request a new one.' };
  if (Date.parse(row.expires_at + 'Z') < Date.now()) {
    await q.run(c, 'DELETE FROM otp_codes WHERE id = ?', row.id);
    return { ok: false, reason: 'That code expired. Please request a new one.' };
  }
  if (row.attempts >= 5) {
    await q.run(c, 'DELETE FROM otp_codes WHERE id = ?', row.id);
    return { ok: false, reason: 'Too many attempts — please request a new code.' };
  }
  if ((await sha256Hex(String(input || '').trim())) !== row.code_hash) {
    await q.run(c, 'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', row.id);
    return { ok: false, reason: 'Incorrect code. Please try again.' };
  }
  await q.run(c, 'DELETE FROM otp_codes WHERE id = ?', row.id);
  return { ok: true };
}
