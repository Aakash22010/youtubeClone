import nodemailer from 'nodemailer';

// ── Transporter ───────────────────────────────────────────────────────────────
// Uses Gmail with an App Password. In Render, set:
//   EMAIL_USER = youraddress@gmail.com
//   EMAIL_PASS = your-16-char-app-password  (Gmail → Security → App passwords)

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment variables.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ── Plan invoice email ─────────────────────────────────────────────────────────

interface InvoiceOptions {
  toEmail:     string;
  displayName: string;
  plan:        string;
  amount:      number;   // INR
  paymentId:   string;
  planFrom:    Date;
  planTo:      Date;
}

export async function sendPlanInvoiceEmail(opts: InvoiceOptions): Promise<void> {
  const transporter = getTransporter();

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const planColors: Record<string, string> = {
    bronze: '#b45309',
    silver: '#64748b',
    gold:   '#d97706',
  };
  const accentColor = planColors[opts.plan.toLowerCase()] ?? '#2563eb';
  const planBadge   = { bronze: '🥉', silver: '🥈', gold: '🥇' }[opts.plan.toLowerCase()] ?? '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>Your ${opts.plan} Plan Invoice</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${accentColor};padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:28px;">${planBadge}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">
                ${opts.plan} Plan Activated
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Payment confirmed — thank you!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">
                Hi <strong>${opts.displayName}</strong>,<br/>
                Your <strong>${opts.plan} Plan</strong> is now active. Here are your invoice details:
              </p>

              <!-- Invoice table -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">
                    DESCRIPTION
                  </td>
                  <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right;">
                    AMOUNT
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:15px;color:#111827;border-bottom:1px solid #e5e7eb;">
                    ${planBadge} ${opts.plan} Plan — 1 Month
                  </td>
                  <td style="padding:14px 16px;font-size:15px;color:#111827;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb;">
                    ₹${opts.amount}
                  </td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:600;">
                    Total Paid
                  </td>
                  <td style="padding:12px 16px;font-size:16px;color:${accentColor};font-weight:700;text-align:right;">
                    ₹${opts.amount}
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${[
                  ['Payment ID',   opts.paymentId],
                  ['Plan Valid From', fmt(opts.planFrom)],
                  ['Plan Expires On', fmt(opts.planTo)],
                  ['Billed To',    opts.toEmail],
                ].map(([label, value]) => `
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">${label}</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
                  </tr>
                `).join('')}
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Your plan will automatically revert to Free after the expiry date.
                You can renew or upgrade anytime from your profile page.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                YouTubeClone · This is an automated invoice, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"YouTubeClone" <${process.env.EMAIL_USER}>`,
    to:      opts.toEmail,
    subject: `${planBadge} Your ${opts.plan} Plan Invoice — ₹${opts.amount}`,
    html,
  });
}