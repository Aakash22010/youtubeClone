// ── South India states ────────────────────────────────────────────────────────
export const SOUTH_INDIA_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
];

export type AuthMethod = 'email-otp' | 'phone-otp';
export type Theme      = 'light' | 'dark';

export interface LocationThemeResult {
  theme:      Theme;
  authMethod: AuthMethod;
  isSouthIndia: boolean;
  state:      string | null;
  isISTWindow: boolean;   // true if 10:00–12:00 IST
}

// ── Get current IST hour (0–23) ───────────────────────────────────────────────
export function getISTHour(): number {
  const now       = new Date();
  // IST = UTC + 5h30m
  const utcMs     = now.getTime() + now.getTimezoneOffset() * 60_000;
  const istMs     = utcMs + 5.5 * 60 * 60_000;
  return new Date(istMs).getHours();
}

// ── Reverse geocode via Nominatim (no API key needed) ────────────────────────
async function getStateFromCoords(lat: number, lon: number): Promise<string | null> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data?.address?.state ?? null;
  } catch {
    return null;
  }
}

// ── Browser Geolocation ───────────────────────────────────────────────────────
function getBrowserCoords(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout: 5000 }
    );
  });
}

// ── IP fallback ───────────────────────────────────────────────────────────────
async function getStateFromIP(): Promise<string | null> {
  try {
    const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data?.region ?? null;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function detectLocationTheme(): Promise<LocationThemeResult> {
  // 1. Try browser geolocation first, fall back to IP
  let state: string | null = null;
  const coords = await getBrowserCoords();
  if (coords) {
    state = await getStateFromCoords(coords.lat, coords.lon);
  }
  if (!state) {
    state = await getStateFromIP();
  }

  const isSouthIndia = !!state && SOUTH_INDIA_STATES.some(s =>
    state!.toLowerCase().includes(s.toLowerCase())
  );

  // 2. Check IST time window (10:00–11:59)
  const istHour    = getISTHour();
  const isISTWindow = istHour >= 10 && istHour < 12;

  // 3. Determine theme: light only if South India AND in time window
  const theme: Theme = (isSouthIndia && isISTWindow) ? 'light' : 'dark';

  // 4. Auth method: email OTP for South India, phone OTP otherwise
  const authMethod: AuthMethod = isSouthIndia ? 'email-otp' : 'phone-otp';

  return { theme, authMethod, isSouthIndia, state, isISTWindow };
}