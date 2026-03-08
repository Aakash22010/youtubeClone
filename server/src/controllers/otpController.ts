import { Request, Response } from 'express';
import { Resend } from 'resend';

// ── In-memory OTP store ───────────────────────────────────────────────────────
// { email → { otp, expiresAt } }
// Cleared automatically on verify or expiry check

interface OTPEntry {
  otp:       string;
  expiresAt: number;  // Date.now() ms
}

const otpStore = new Map<string, OTPEntry>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

// ── POST /api/otp/send ────────────────────────────────────────────────────────
// Body: { email: string }
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp       = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    const resend = getResend();
    const { error } = await resend.emails.send({
      from:    'YouTubeClone <onboarding@resend.dev>',
      to:      email,
      subject: `Your login OTP - ${otp}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#111827;margin-bottom:8px;">Your Login OTP</h2>
          <p style="color:#6b7280;margin-bottom:24px;">Use this code to complete your sign-in. It expires in 10 minutes.</p>
          <div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#2563eb;">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you didn't request this, ignore this email.</p>
          <p style="color:#9ca3af;font-size:13px;">YouTubeClone Security Team</p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('sendEmailOTP error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ── POST /api/otp/verify ──────────────────────────────────────────────────────
// Body: { email: string, otp: string }
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const entry = otpStore.get(email.toLowerCase());

    if (!entry) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (entry.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP verified — clean up
    otpStore.delete(email.toLowerCase());
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};