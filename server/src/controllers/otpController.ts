import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

// ── In-memory OTP store ───────────────────────────────────────────────────────
interface OTPEntry {
  otp:       string;
  expiresAt: number;
}

const otpStore      = new Map<string, OTPEntry>();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Force IPv4 to avoid ENETUNREACH on Render free tier (Gmail resolves to IPv6)
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in environment variables');
  }
  return nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    family: 4,        // force IPv4
    auth: { user, pass },
  } as any);
}

// ── POST /api/otp/send-email ──────────────────────────────────────────────────
// Body: { email: string }
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp       = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    const transporter = getTransporter();
    await transporter.sendMail({
      from:    `"YouTubeClone" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Your login OTP - ${otp}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="color:#111827;margin-bottom:8px;">Your Login OTP</h2>
          <p style="color:#6b7280;margin-bottom:24px;">
            Use this code to complete your sign-in. It expires in 10 minutes.
          </p>
          <div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#2563eb;">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you did not request this, ignore this email.</p>
          <p style="color:#9ca3af;font-size:13px;">YouTubeClone Security Team</p>
        </div>
      `,
    });

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