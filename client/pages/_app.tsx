import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';  // ← NEW
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const noLayoutPaths = ['/login', '/signup'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  return (
    <ThemeProvider>        {/* ← wraps everything so theme is available site-wide */}
      <AuthProvider>
        <Head>
          <title>Aakash Dahiya | Full-Stack Web Developer</title>
          <meta name="description" content="Aakash Dahiya - Full-Stack Web Developer. Portfolio showcasing a beautiful full-stack YouTube clone built with Next.js, Node.js, and MongoDB." />
          <meta property="og:title" content="Aakash Dahiya | Full-Stack Web Developer" />
          <meta property="og:description" content="Aakash Dahiya - Full-Stack Web Developer. Portfolio showcasing a beautiful full-stack YouTube clone built with Next.js, Node.js, and MongoDB." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Aakash Dahiya Portfolio" />
          <meta property="og:url" content="https://youtube-clone-three-weld.vercel.app/" />
          <meta property="og:image" content="https://youtube-clone-three-weld.vercel.app/og-image.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="Aakash Dahiya - Full-Stack Web Developer" />
          <meta property="og:image:type" content="image/png" />
          <meta name="twitter:card" content="summary_large_image" />
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