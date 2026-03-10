import { Request, Response } from 'express';
import { Resend } from 'resend';
import axios from 'axios';  // already in your dependencies — no new install needed

// ── In-memory OTP store ───────────────────────────────────────────────────────
interface OTPEntry { otp: string; expiresAt: number; }
const otpStore      = new Map<string, OTPEntry>();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set in environment variables');
  return new Resend(key);
}

// ── POST /api/otp/send-email ──────────────────────────────────────────────────
// South India users
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
          <p style="color:#9ca3af;font-size:13px;">If you did not request this, ignore this email.</p>
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

// ── POST /api/otp/send-phone ──────────────────────────────────────────────────
// Non-South India users via Fast2SMS
export const sendPhoneOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    // Normalise: keep last 10 digits
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) throw new Error('FAST2SMS_API_KEY not set in environment variables');

    const otp       = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    otpStore.set(digits, { otp, expiresAt });

    // Fast2SMS OTP route via axios (CommonJS-compatible, already installed)
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route:            'otp',
        variables_values: otp,
        numbers:          digits,
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // Log full response so we can diagnose Fast2SMS errors
    console.log('Fast2SMS response:', JSON.stringify(response.data));

    if (!response.data?.return) {
      const messages = response.data?.message;
      const msg = Array.isArray(messages)
        ? messages.join(' | ')
        : (typeof messages === 'string' ? messages : JSON.stringify(response.data));
      throw new Error(msg || 'Fast2SMS send failed');
    }

    res.json({ success: true, message: `OTP sent to ${digits.slice(0, 4)}XXXXXX` });
  } catch (err: any) {
    if (err.response) {
      console.error('Fast2SMS HTTP error:', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error('sendPhoneOTP full error:', err.message);
    }
    const msg = err.message || 'Failed to send SMS';
    res.status(500).json({ error: msg });
  }
};


// ── POST /api/otp/verify ──────────────────────────────────────────────────────
// key = email (South India) or 10-digit phone (other regions)
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { key, otp } = req.body;
    if (!key || !otp) return res.status(400).json({ error: 'Key and OTP are required' });

    const normalised = key.includes('@')
      ? key.toLowerCase()
      : key.replace(/\D/g, '').slice(-10);

    const entry = otpStore.get(normalised);

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