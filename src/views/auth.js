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
    <p class="muted">We'll text a code to your mobile number to verify it — that's required before you can place an order. Email verification is optional.</p>
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

const PHONE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
const MAIL_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>';

export function verify(ctx, { user, smsReady, mailReady }) {
  const codeForm = (channel) => `
      <form action="/verify/${channel}" method="POST" class="otp-form">
        <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required autofocus>
        <button class="btn">Verify</button>
      </form>
      <p class="muted small otp-note">Didn't get it? <form action="/verify/${channel}/resend" method="POST" class="inline-form"><button class="link-btn">Send a new code</button></form> (wait about a minute between codes)</p>`;

  return page(ctx, `
<section class="section narrow">
  <div class="card center auth-card verify-hero">
    <span class="feature-icon">${PHONE_ICON}</span>
    <h1>${user.phone_verified ? 'Mobile number verified' : 'Verify your mobile number'}</h1>
    ${user.phone_verified
      ? `<p class="muted">Your mobile number <strong>${esc(user.phone)}</strong> is verified — you can place orders.</p>
         <a class="btn btn-lg" href="/shop">Continue shopping</a>`
      : `<p class="muted">Required before you can place an order. We sent a 6-digit code by text message to <strong>${esc(user.phone)}</strong>.</p>
         ${!smsReady ? '<div class="flash flash-warn">Text messages are not set up for this store yet, so the code cannot reach your phone. The store owner needs to add the SMS settings under Admin → Payments first — until then, ask the store owner to verify your number manually from the admin Users page.</div>' : ''}
         ${codeForm('phone')}`}
  </div>

  <div class="card auth-card verify-optional">
    <div class="verify-opt-head">
      <span class="feature-icon">${MAIL_ICON}</span>
      <h2>Email verification</h2>
      <span class="badge badge-pending">optional</span>
      ${user.email_verified ? '<span class="badge badge-paid">verified</span>' : ''}
    </div>
    ${user.email_verified
      ? `<p class="muted">Your email address <strong>${esc(user.email)}</strong> is verified — you'll receive order confirmations by email.</p>`
      : `<p class="muted">Optional — verifying your email lets you receive order confirmations. You can place orders without it.</p>
         ${!mailReady ? '<div class="flash flash-warn">Email sending is not set up for this store yet, so email codes cannot be delivered. The store owner needs to add the email settings under Admin → Payments first.</div>' : ''}
         ${codeForm('email')}`}
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
      <tr><td>Email</td><td>${esc(user.email)} ${user.email_verified ? '✓' : '<span class="muted small">(optional, not verified)</span>'}</td></tr>
      <tr><td>Mobile</td><td>${esc(user.phone)} ${user.phone_verified ? '✓' : '<strong style="color:#e5484d">not verified</strong>'}</td></tr>
      <tr><td>Member since</td><td>${esc(user.created_at.slice(0, 10))}</td></tr>
    </table>
    ${!user.phone_verified
      ? '<a class="btn btn-block" href="/verify">Verify my mobile number</a>'
      : (!user.email_verified ? '<p class="muted small center"><a href="/verify">Verify email as well (optional)</a> — get order confirmations by email.</p>' : '')}
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
