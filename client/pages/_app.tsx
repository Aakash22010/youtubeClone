import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';  // ← NEW
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayoutPaths = ['/login', '/signup'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  return (
    <ThemeProvider>        {/* ← wraps everything so theme is available site-wide */}
      <AuthProvider>
        {shouldUseLayout ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : (
          <Component {...pageProps} />
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default MyApp;