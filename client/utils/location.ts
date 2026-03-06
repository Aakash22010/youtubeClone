export async function getUserCity(): Promise<string> {
  // ── Strategy 1: Browser Geolocation + Reverse Geocoding ──────────────────
  const fromBrowser = await getCityFromBrowser();
  if (fromBrowser) return fromBrowser;

  // ── Strategy 2: IP-based fallback ─────────────────────────────────────────
  const fromIP = await getCityFromIP();
  if (fromIP) return fromIP;

  return 'Unknown';
}

// ── Browser Geolocation ────────────────────────────────────────────────────

function getBrowserCoords(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 } // cache for 5 min
    );
  });
}

async function getCityFromBrowser(): Promise<string | null> {
  try {
    const coords = await getBrowserCoords();
    // Nominatim (OpenStreetMap) — free, no API key needed
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Nominatim returns city/town/village/hamlet — use whichever is present
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.hamlet ||
      data.address?.county ||
      null;
    return city ?? null;
  } catch {
    return null;
  }
}

// ── IP Fallback ────────────────────────────────────────────────────────────

async function getCityFromIP(): Promise<string | null> {
  try {
    // ipapi.co — free tier, 1000 req/day
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.city ?? null;
  } catch {
    return null;
  }
}