import axios from 'axios';

// ── Brevo (formerly Sendinblue) HTTP API ──────────────────────────────────────
// Free tier: 300 emails/day, sends to ANY email address, no domain needed.
// Uses HTTPS (port 443) — works on Render free tier.
// Get API key: https://app.brevo.com → Settings → API Keys

function getBrevoKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set in environment variables');
  return key;
}

async function sendEmail(opts: {
  toEmail:  string;
  toName:   string;
  subject:  string;
  html:     string;
}): Promise<void> {
  const apiKey = getBrevoKey();

  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender:     { name: 'YouTubeClone', email: process.env.BREVO_SENDER_EMAIL },
      to:         [{ email: opts.toEmail, name: opts.toName }],
      subject:    opts.subject,
      htmlContent: opts.html,
    },
    {
      headers: {
        'api-key':      apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status !== 201) {
    throw new Error(`Brevo API error: ${JSON.stringify(response.data)}`);
  }
}

// ── Plan invoice email ─────────────────────────────────────────────────────────

interface InvoiceOptions {
  toEmail:     string;
  displayName: string;
  plan:        string;
  amount:      number;
  paymentId:   string;
  planFrom:    Date;
  planTo:      Date;
}

export async function sendPlanInvoiceEmail(opts: InvoiceOptions): Promise<void> {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const planColors: Record<string, string> = {
    bronze:  '#b45309',
    silver:  '#64748b',
    gold:    '#d97706',
    premium: '#2563eb',
  };
  const accentColor = planColors[opts.plan.toLowerCase()] ?? '#2563eb';
  const planBadge   = ({ bronze: '🥉', silver: '🥈', gold: '🥇', premium: '⭐' } as Record<string, string>)[opts.plan.toLowerCase()] ?? '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${accentColor};padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:28px;">${planBadge}</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${opts.plan} Plan Activated</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Payment confirmed - thank you!</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Hi <strong>${opts.displayName}</strong>,<br/>
              Your <strong>${opts.plan} Plan</strong> is now active. Here are your invoice details:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f9fafb;">
                <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DESCRIPTION</td>
                <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right;">AMOUNT</td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-size:15px;color:#111827;border-bottom:1px solid #e5e7eb;">${planBadge} ${opts.plan} Plan - 1 Month</td>
                <td style="padding:14px 16px;font-size:15px;color:#111827;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb;">Rs.${opts.amount}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:14px;color:#374151;font-weight:600;">Total Paid</td>
                <td style="padding:12px 16px;font-size:16px;color:${accentColor};font-weight:700;text-align:right;">Rs.${opts.amount}</td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">Payment ID</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${opts.paymentId}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Plan Valid From</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${fmt(opts.planFrom)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Plan Expires On</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${fmt(opts.planTo)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Billed To</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${opts.toEmail}</td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Your plan will automatically revert to Free after the expiry date.
              You can renew or upgrade anytime from your profile page.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">YouTubeClone - This is an automated invoice, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail({
    toEmail:  opts.toEmail,
    toName:   opts.displayName,
    subject:  `Your ${opts.plan} Plan Invoice - Rs.${opts.amount}`,
    html,
  });
}