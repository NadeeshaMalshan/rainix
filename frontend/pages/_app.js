import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import './main.css';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const showFooter = ['/', '/landing'].includes(router.pathname);
  const isChatUI = router.pathname.includes('/ai');

  const [isIdle, setIsIdle] = useState(false);
  const [showRain, setShowRain] = useState(false);

  useEffect(() => {
    let idleTimer;
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsIdle(true), 5000); // 5 secs
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdle, true));
    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetIdle, true));
    };
  }, []);

  useEffect(() => {
    let timeout;
    if (isIdle) {
      setShowRain(true);
    } else {
      timeout = setTimeout(() => setShowRain(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [isIdle]);

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        
        {/* Global Tailwind Theme Extensions */}
        <script id="tailwind-config" dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
                darkMode: "class",
                theme: {
                    extend: {
                        "screens": {
                            "xs": "375px"
                        },
                        "colors": {
                            "inverse-surface": "#e2e2e7",
                            "on-primary-container": "#00285c",
                            "surface-container-highest": "#333539",
                            "on-primary-fixed": "#001a41",
                            "primary": "#adc6ff",
                            "tertiary-fixed": "#ffdad5",
                            "surface-container-high": "#282a2e",
                            "on-error": "#690005",
                            "error-container": "#93000a",
                            "on-background": "#e2e2e7",
                            "tertiary": "#ffb4aa",
                            "surface-container": "#1e2023",
                            "on-secondary-fixed-variant": "#39475f",
                            "on-surface": "#e2e2e7",
                            "surface-dim": "#111317",
                            "surface-container-low": "#1a1c1f",
                            "on-primary": "#002e69",
                            "on-surface-variant": "#c1c6d7",
                            "error": "#ffb4ab",
                            "tertiary-container": "#ff5545",
                            "on-tertiary-fixed-variant": "#930005",
                            "on-tertiary": "#690003",
                            "on-error-container": "#ffdad6",
                            "inverse-primary": "#005bc1",
                            "on-tertiary-fixed": "#410001",
                            "primary-container": "#4b8eff",
                            "primary-fixed-dim": "#adc6ff",
                            "outline-variant": "#414755",
                            "inverse-on-surface": "#2e3034",
                            "on-secondary": "#233148",
                            "surface-bright": "#37393d",
                            "secondary-container": "#3c4962",
                            "on-primary-fixed-variant": "#004493",
                            "secondary-fixed-dim": "#b9c7e4",
                            "on-tertiary-container": "#5c0002",
                            "secondary-fixed": "#d6e3ff",
                            "on-secondary-fixed": "#0d1c32",
                            "surface-tint": "#adc6ff",
                            "tertiary-fixed-dim": "#ffb4aa",
                            "surface-variant": "#333539",
                            "background": "#111317",
                            "outline": "#8b90a0",
                            "secondary": "#b9c7e4",
                            "surface-container-lowest": "#0c0e12",
                            "primary-fixed": "#d8e2ff",
                            "on-secondary-container": "#abb9d6",
                            "surface": "#111317"
                        },
                        "borderRadius": {
                            "DEFAULT": "1rem",
                            "lg": "2rem",
                            "xl": "3rem",
                            "full": "9999px"
                        },
                        "spacing": {
                            "view-padding": "24px",
                            "top-margin-ratio": "0.35",
                            "base": "8px",
                            "card-gap": "16px",
                            "bottom-safe-area": "32px"
                        },
                        "fontFamily": {
                            "poppins": ["Poppins", "sans-serif"],
                            "title-md": ["Poppins", "sans-serif"],
                            "body-lg": ["Poppins", "sans-serif"],
                            "body-md": ["Poppins", "sans-serif"],
                            "headline-lg-mobile": ["Poppins", "sans-serif"],
                            "headline-lg": ["Poppins", "sans-serif"],
                            "label-sm": ["Poppins", "sans-serif"],
                            "display-lg": ["Poppins", "sans-serif"]
                        },
                        "fontSize": {
                            "title-md": ["20px", {"lineHeight": "1.4", "fontWeight": "600"}],
                            "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400"}],
                            "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}],
                            "headline-lg-mobile": ["28px", {"lineHeight": "1.2", "fontWeight": "700"}],
                            "headline-lg": ["32px", {"lineHeight": "1.2", "fontWeight": "700"}],
                            "label-sm": ["12px", {"lineHeight": "1.2", "letterSpacing": "0.05em", "fontWeight": "600"}],
                            "display-lg": ["64px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700"}]
                        },
                        "boxShadow": {
                            "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.15)",
                            "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.1)",
                            "glass-lg": "0 12px 48px 0 rgba(0, 0, 0, 0.2)",
                            "neon": "0 0 20px rgba(255, 255, 255, 0.2)"
                        }
                    }
                }
            }
          `
        }} />
        
        {/* Tailwind CSS Play CDN - MUST be loaded after tailwind.config */}
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
      </Head>
    <div className="flex flex-col min-h-screen">
      <style>{`
        @keyframes idleRainFall {
          0% { transform: translateY(-20px) rotate(15deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(-20vh) rotate(15deg); opacity: 0; }
        }
      `}</style>
      {showRain && !isChatUI && (
        <div className={`fixed inset-0 pointer-events-none z-[0] overflow-hidden transition-opacity duration-[2000ms] bg-transparent ${isIdle ? 'opacity-100' : 'opacity-0'}`}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute w-[1px] h-6 rounded-full bg-black/30 dark:bg-white/30"
              style={{
                left: `${-10 + Math.random() * 120}%`,
                top: `-40px`,
                animation: `idleRainFall ${1.5 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * 3}s`, /* Positive delay so it starts empty and falls down */
                willChange: 'transform'
              }}
            />
          ))}
        </div>
      )}
      <main className="flex-1">
        <Component {...pageProps} />
      </main>
      {showFooter && <Footer />}
    </div>
  </>
  );
}
