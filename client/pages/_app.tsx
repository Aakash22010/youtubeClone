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
            defaultTitle: 'Aakash Dahiya | Full-Stack Web Developer',
            description: "Aakash Dahiya - Full-Stack Web Developer. Portfolio showcasing a beautiful full-stack YouTube clone built with Next.js, Node.js, AND MongoDB.",
            openGraph: {
              type: 'website',
              locale: 'en_IE',
              siteName: 'Aakash Dahiya Portfolio',
              images: [
                {
                  url: 'https://youtube-clone-three-weld.vercel.app/og-image.svg',
                  width: 1200,
                  height: 630,
                  alt: 'Aakash Dahiya - Full-Stack Web Developer',
                }
              ]
            },
            twitter: {
              cardType: 'summary_large_image',
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