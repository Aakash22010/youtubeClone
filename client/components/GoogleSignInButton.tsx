import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { googleClientId, renderGoogleButton } from '../lib/google';

interface Props {
  onSuccess: () => void;
  onError: (message: string) => void;
}

/**
 * Google's own rendered sign-in button. It hands back an ID token, which
 * AuthContext trades with our API for a session JWT.
 */
export default function GoogleSignInButton({ onSuccess, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();

  // Held in refs so the button is rendered once: passing the callbacks as effect
  // dependencies would tear down and redraw it on every parent render.
  const handlers = useRef({ onSuccess, onError, loginWithGoogle });
  handlers.current = { onSuccess, onError, loginWithGoogle };

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    if (!googleClientId()) {
      handlers.current.onError('Google sign-in is not configured');
      return;
    }

    let cancelled = false;
    renderGoogleButton(el, async (credential) => {
      try {
        await handlers.current.loginWithGoogle(credential);
        if (!cancelled) handlers.current.onSuccess();
      } catch (error: any) {
        if (!cancelled) {
          handlers.current.onError(error?.response?.data?.error || 'Google sign-in failed');
        }
      }
    }).catch((error: Error) => {
      if (!cancelled) handlers.current.onError(error.message);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={container} className="flex justify-center min-h-[44px]" />;
}
