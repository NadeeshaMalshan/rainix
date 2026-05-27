import Head from 'next/head';
import './main.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        
        {/* Tailwind CSS Play CDN */}
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        
        {/* Global Tailwind Theme Extensions */}
        <script id="tailwind-config" dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
                darkMode: "media",
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
                        }
                    }
                }
            }
          `
        }} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
