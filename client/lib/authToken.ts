/**
 * Where the session token lives on the client.
 *
 * Firebase used to hold this in IndexedDB and refresh it behind the scenes; our
 * own JWT is a plain string with a 30-day life, so it goes in localStorage and
 * the server rejects it once it expires.
 */
const KEY = 'yt_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null; // private mode, or storage disabled
  }
};

export const setToken = (token: string): void => {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    /* not fatal — the session just will not survive a reload */
  }
};

export const clearToken = (): void => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
};
