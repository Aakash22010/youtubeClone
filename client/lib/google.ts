/**
 * Google Identity Services, loaded on demand.
 *
 * Replaces firebase/auth's signInWithPopup. GIS hands back a Google ID token
 * ("credential"), which the server verifies and trades for our own JWT — the
 * browser never holds a Google session of its own.
 *
 * This renders Google's own button rather than calling prompt(). One Tap can be
 * suppressed by the browser without ever invoking the callback, which would
 * leave a click hanging with no error to show the user.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

let loader: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'));
  if (window.google?.accounts?.id) return Promise.resolve();

  // One script tag no matter how many times this is called.
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loader = null; // let a later attempt retry
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

export const googleClientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/**
 * Draws Google's sign-in button into `container` and calls back with the ID
 * token when the user completes the flow.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
): Promise<void> {
  const clientId = googleClientId();
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');

  await loadGis();

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: { credential?: string }) => {
      if (response?.credential) onCredential(response.credential);
    },
  });

  container.replaceChildren(); // drop a previously rendered button on re-render
  window.google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width: container.clientWidth || 320,
    text: 'continue_with',
  });
}
