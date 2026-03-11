import { Request, Response } from 'express';
import axios from 'axios';

interface OTPEntry { otp: string; expiresAt: number; }
const otpStore      = new Map<string, OTPEntry>();
const OTP_EXPIRY_MS = 10 * 60 * 1000;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getBrevoKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set in environment variables');
  return key;
}

// ── POST /api/otp/send-email ──────────────────────────────────────────────────
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp       = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender:      { name: 'YouTubeClone', email: process.env.BREVO_SENDER_EMAIL },
        to:          [{ email, name: email }],
        subject:     `Your login OTP - ${otp}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
            <h2 style="color:#111827;margin-bottom:8px;">Your Login OTP</h2>
            <p style="color:#6b7280;margin-bottom:24px;">Use this code to sign in. It expires in 10 minutes.</p>
            <div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#2563eb;">${otp}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you did not request this, ignore this email.</p>
            <p style="color:#9ca3af;font-size:13px;">YouTubeClone Security Team</p>
          </div>
        `,
      },
      {
        headers: {
          'api-key':      getBrevoKey(),
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err: any) {
    const msg = err.response?.data?.message || (err as Error).message;
    console.error('sendEmailOTP error:', msg);
    res.status(500).json({ error: msg });
  }
};

// ── POST /api/otp/verify ──────────────────────────────────────────────────────
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const normalised = email.toLowerCase();
    const entry      = otpStore.get(normalised);

    if (!entry) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalised);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (entry.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    otpStore.delete(normalised);
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};