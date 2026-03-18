import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';  // ← NEW
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { generateDefaultSeo } from 'next-seo/pages';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayoutPaths = ['/login', '/signup'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  return (
    <ThemeProvider>        {/* ← wraps everything so theme is available site-wide */}
      <AuthProvider>
        <Head>
          {generateDefaultSeo({
            titleTemplate: '%s | YouTube Clone',
            defaultTitle: 'YouTube Clone',
            description: "A beautiful full-stack YouTube clone built with Next.js, featuring real-time video calls, screen sharing, and recording.",
            openGraph: {
              type: 'website',
              locale: 'en_IE',
              siteName: 'YouTube Clone',
            }
          })}
          <link rel="icon" type="image/svg+xml" href="/logo.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
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