import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

/**
 * Send an email notification when a transaction needs manual review.
 */
export async function sendReviewNotification(user, transaction) {
  console.log(`[EMAIL DEBUG] Checking review notification for User ${user?.id}...`);
  if (!user || !user.email) {
    console.log(`[EMAIL DEBUG] Skipping: User has no email set.`);
    return;
  }
  if (!user.email_notifications) {
    console.log(`[EMAIL DEBUG] Skipping: User disabled email notifications.`);
    return;
  }
  
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[EMAIL DEBUG] Skipping: SMTP not configured.`);
    return;
  }

  const subject = `💰 Action needed: Transaction from ${transaction.vendor}`;
  const amount = transaction.amount ? `$${Number(transaction.amount).toFixed(2)}` : 'Unknown amount';

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0c0c1d; color: #f0f0f0; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin-bottom: 24px;">
        VU Budget
      </div>
      <h2 style="margin: 0 0 8px; font-size: 20px; color: white;">Transaction Needs Your Review</h2>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">A new transaction was detected but could not be automatically categorized.</p>

      <div style="background: rgba(255,255,255,0.06); border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vendor</span>
          <span style="color: white; font-weight: 600;">${transaction.vendor || 'Unknown'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</span>
          <span style="color: #a78bfa; font-weight: 700; font-size: 18px;">${amount}</span>
        </div>
      </div>

      <a href="${process.env.APP_URL || 'https://budget.vidalpablo.com'}/transactions?tab=review"
         style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">
        Categorize Transaction →
      </a>

      <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 24px;">
        To stop receiving these emails, log in and update your notification settings.
      </p>
    </div>
  `;

  try {
    console.log(`[EMAIL DEBUG] Attempting to send to ${user.email} via ${process.env.SMTP_HOST}...`);
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject,
      html
    });
    console.log(`[EMAIL DEBUG] ✅ Review email successfully sent to ${user.email}`);
  } catch (err) {
    console.error('[EMAIL ERROR] Failed to send email:', err);
  }
}

/**
 * Send a welcome email when a user registers.
 */
export async function sendWelcomeEmail(user) {
  const mailer = getTransporter();
  if (!mailer || !user.email) return;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: '👋 Welcome to VU Budget!',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0c0c1d; color: #f0f0f0; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: white;">Welcome to VU Budget, ${user.display_name}!</h2>
          <p style="color: rgba(255,255,255,0.6);">Your budget tracking app is ready. Visit <a href="${process.env.APP_URL || 'https://budget.vidalpablo.com'}" style="color: #a78bfa;">budget.vidalpablo.com</a> to get started.</p>
        </div>
      `
    });
  } catch (err) {
    console.error('Welcome email error:', err.message);
  }
}

/**
 * Send email verification link on registration.
 */
export async function sendVerificationEmail(user, verifyToken) {
  const mailer = getTransporter();
  if (!mailer || !user.email) return;

  const appUrl = process.env.APP_URL || 'https://budget.vidalpablo.com';
  const verifyUrl = `${appUrl}/verify?token=${verifyToken}`;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: '✅ Verify your VU Budget account',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0c0c1d; color: #f0f0f0; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin-bottom: 24px;">
            VU Budget
          </div>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: white;">Verify your email</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">
            Hi ${user.display_name}, click the button below to activate your account.
          </p>
          <a href="${verifyUrl}"
             style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">
            Verify My Account →
          </a>
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 24px;">
            If you didn't create an account, you can ignore this email.<br>
            Link expires in 48 hours.
          </p>
        </div>
      `
    });
    console.log(`📧 Verification email sent to ${user.email}`);
  } catch (err) {
    console.error('Verification email error:', err.message);
  }
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(user, token) {
  const mailer = getTransporter();
  if (!mailer || !user.email) return;

  const appUrl = process.env.APP_URL || 'https://budget.vidalpablo.com';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: '🔒 Reset your VU Budget password',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0c0c1d; color: #f0f0f0; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin-bottom: 24px;">
            VU Budget
          </div>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: white;">Password Reset Request</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">
            Hi ${user.display_name}, we received a request to reset your password. Click the button below to choose a new one.
          </p>
          <a href="${resetUrl}"
             style="background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">
            Reset Password →
          </a>
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.<br>
            Link expires in 1 hour.
          </p>
        </div>
      `
    });
    console.log(`📧 Password reset email sent to ${user.email}`);
  } catch (err) {
    console.error('Password reset email error:', err.message);
  }
}

/**
 * Send a one-time login code to the user's email.
 */
export async function sendLoginCode(user, code) {
  const mailer = getTransporter();
  if (!mailer || !user.email) return;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: '🔑 Your VU Budget Login Code',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0c0c1d; color: #f0f0f0; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 4px 12px; display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: white; margin-bottom: 24px;">
            VU Budget
          </div>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: white;">Your Login Code</h2>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">
            Hi ${user.display_name}, use the code below to sign in to your account. It expires in 10 minutes.
          </p>
          <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a78bfa; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 24px;">
            If you didn't request this code, you can safely ignore this email.<br>
            Never share your code with anyone.
          </p>
        </div>
      `
    });
    console.log(`📧 Login code sent to ${user.email}`);
  } catch (err) {
    console.error('Login code email error:', err.message);
  }
}
