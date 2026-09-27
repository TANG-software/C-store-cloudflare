// C Store Workers — auth & account views.
import { esc } from '../lib.js';
import { page } from './layout.js';

export function login(ctx, next, email, error) {
  return page(ctx, `
<section class="section narrow">
  <div class="card auth-card">
    <h1>Log in</h1>
    ${error ? `<div class="flash flash-error">${esc(error)}</div>` : ''}
    <form action="/login" method="POST">
      <input type="hidden" name="next" value="${esc(next || '')}">
      <label>Email<input type="email" name="email" value="${esc(email || '')}" required autofocus></label>
      <label>Password<input type="password" name="password" required></label>
      <button type="submit" class="btn btn-lg btn-block">Log in</button>
    </form>
    <p class="muted center">New here? <a href="/register">Create an account</a></p>
  </div>
</section>`);
}

export function register(ctx, values) {
  const v = (k) => esc((values && values[k]) || '');
  return page(ctx, `
<section class="section narrow">
  <div class="card auth-card">
    <h1>Create account</h1>
    <p class="muted">We'll verify both your email address and mobile number — required before you can place an order.</p>
    <form action="/register" method="POST">
      <label>Full name<input name="name" required value="${v('name')}"></label>
      <label>Email address<input type="email" name="email" required value="${v('email')}"></label>
      <label>Mobile number<input name="phone" required placeholder="+31 6 12345678" value="${v('phone')}"></label>
      <label>Password<input type="password" name="password" required minlength="8"></label>
      <label>Confirm password<input type="password" name="confirm" required minlength="8"></label>
      <button type="submit" class="btn btn-lg btn-block">Create account</button>
    </form>
    <p class="muted center">Already registered? <a href="/login">Log in</a></p>
  </div>
</section>`);
}

export function verify(ctx, { user, required, showOtpDev }) {
  const block = (done, icon, channel, channelLabel, addr) => done
    ? `<p class="muted">Your ${channelLabel} <strong>${esc(addr)}</strong> is verified. ✓</p>`
    : `<p class="muted">We sent a 6-digit code to <strong>${esc(addr)}</strong>.</p>
        <form action="/verify/${channel}" method="POST" class="otp-form">
          <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required>
          <button class="btn">Verify ${channelLabel}</button>
        </form>
        <form action="/verify/${channel}/resend" method="POST"><button class="link-btn">Resend code</button></form>`;
  return page(ctx, `
<section class="section narrow">
  <div class="card center">
    <h1>Verify your account</h1>
    <p class="muted">${required ? 'Both your email and mobile number must be verified before you can place an order.' : 'One last step — confirm it\'s really you.'}</p>
  </div>

  ${showOtpDev ? `
  <div class="flash flash-warn">⚠️ Development mode: no email/SMS provider configured yet, so verification codes are printed in the server logs (visible with <code>wrangler tail</code>). Add an email API key and Twilio credentials in Admin → Payments to send real codes.</div>` : ''}

  <div class="verify-grid">
    <div class="card">
      <h2>📧 Email verification <span class="badge ${user.email_verified ? 'badge-paid' : 'badge-pending'}">${user.email_verified ? 'verified' : 'pending'}</span></h2>
      ${block(user.email_verified, '📧', 'email', 'email', user.email)}
    </div>

    <div class="card">
      <h2>📱 Mobile verification <span class="badge ${user.phone_verified ? 'badge-paid' : 'badge-pending'}">${user.phone_verified ? 'verified' : 'pending'}</span></h2>
      ${block(user.phone_verified, '📱', 'phone', 'phone', user.phone)}
    </div>
  </div>
</section>`);
}

export function changePassword(ctx, forced) {
  return page(ctx, `
<section class="section narrow">
  <div class="card auth-card">
    <h1>Change password</h1>
    ${forced ? '<div class="flash flash-warn">🔐 For security you must set your own password before continuing. This is your first login with the default admin password.</div>' : ''}
    <form action="/change-password" method="POST">
      <label>Current password<input type="password" name="current" autocomplete="current-password" required></label>
      <label>New password (at least 8 characters)<input type="password" name="password" autocomplete="new-password" required minlength="8"></label>
      <label>Confirm new password<input type="password" name="confirm" autocomplete="new-password" required minlength="8"></label>
      <button type="submit" class="btn btn-lg btn-block">Save new password</button>
    </form>
  </div>
</section>`);
}

export function notFound(ctx) {
  return page(ctx, `
<section class="section narrow center">
  <div class="card">
    <div class="big-icon">🧭</div>
    <h1>Page not found</h1>
    <p class="muted">The page you're looking for doesn't exist (anymore).</p>
    <a class="btn" href="/">Back to the shop</a>
  </div>
</section>`);
}

export function serverError(ctx) {
  return page(ctx, `
<section class="section narrow center">
  <div class="card">
    <div class="big-icon">😵</div>
    <h1>Something went wrong</h1>
    <p class="muted">An unexpected error occurred. Please try again.</p>
    <a class="btn" href="/">Back to the shop</a>
  </div>
</section>`);
}

export function account(ctx, { user, orders }) {
  const orderRows = orders.map((o) => `
        <tr>
          <td><a href="/order/${o.id}">${esc(o.order_number)}</a></td>
          <td>${esc(o.created_at.slice(0, 10))}</td>
          <td>€${(o.total_cents / 100).toFixed(2)}</td>
          <td><span class="badge badge-${esc(o.status)}">${esc(o.status.replace(/_/g, ' '))}</span></td>
        </tr>`).join('');
  return page(ctx, `
<section class="section narrow">
  <h1>My account</h1>
  <div class="verify-grid">
    <div class="card">
      <h2>Profile</h2>
      <table class="table">
        <tr><td>Name</td><td>${esc(user.name)}</td></tr>
        <tr><td>Email</td><td>${esc(user.email)} ${user.email_verified ? '✅' : '❌'}</td></tr>
        <tr><td>Mobile</td><td>${esc(user.phone)} ${user.phone_verified ? '✅' : '❌'}</td></tr>
        <tr><td>Member since</td><td>${esc(user.created_at.slice(0, 10))}</td></tr>
      </table>
      ${(!user.email_verified || !user.phone_verified) ? '<a class="btn btn-block" href="/verify">Complete verification</a>' : ''}
      <details class="profile-edit">
        <summary>Edit name / phone</summary>
        <form action="/account/profile" method="POST">
          <label>Name<input name="name" value="${esc(user.name)}" required></label>
          <label>Mobile number (requires re-verification)<input name="phone" value="${esc(user.phone)}" required></label>
          <button class="btn">Save</button>
        </form>
      </details>
      <p class="muted small"><a href="/change-password">Change password</a></p>
    </div>

    <div class="card">
      <h2>Orders</h2>
      ${orders.length === 0
        ? '<p class="muted">No orders yet. <a href="/shop">Start shopping</a>!</p>'
        : `<table class="table">
          <tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr>
          ${orderRows}
        </table>`}
    </div>
  </div>
</section>`);
}
