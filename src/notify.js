// C Store Workers — email (Resend HTTP API; SMTP is impossible on serverless)
// and SMS (Twilio REST). Both fall back to console logging in dev mode.
import { cfg } from './lib.js';

export async function sendMail(c, settings, to, subject, text) {
  const apiKey = cfg(settings, 'email_api_key');
  const from = cfg(settings, 'email_from') || 'C Store <onboarding@resend.dev>';
  if (!apiKey) {
    console.log(`[dev mailer] to=${to} subject="${subject}"\n${text}`);
    return { ok: true, dev: true };
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!r.ok) { console.error('[mailer] resend error', r.status, await r.text()); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('[mailer] fetch failed', e && e.message);
    return { ok: false };
  }
}

export async function sendSms(c, settings, to, body) {
  const sid = cfg(settings, 'twilio_sid');
  const token = cfg(settings, 'twilio_token');
  const from = cfg(settings, 'twilio_from');
  if (!sid || !token || !from) {
    console.log(`[dev sms] to=${to}\n${body}`);
    return { ok: true, dev: true };
  }
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    if (!r.ok) { console.error('[sms] twilio error', r.status, await r.text()); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('[sms] fetch failed', e && e.message);
    return { ok: false };
  }
}

export const mailConfigured = (settings) => !!cfg(settings, 'email_api_key');
export const smsConfigured = (settings) => !!(cfg(settings, 'twilio_sid') && cfg(settings, 'twilio_token') && cfg(settings, 'twilio_from'));
