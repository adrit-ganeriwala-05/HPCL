/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.75rem',
    },
    extend: {
      colors: {
        // Industrial-minimalist system with wider commercial appeal — the
        // whole app, public site and authenticated app (login/portal/admin)
        // alike. Values follow the client-supplied palette brief.
        bg: '#F6F5F1',
        surface: '#FFFFFF',
        dark: '#0D1721',
        'dark-surface': '#16212D',
        text: '#121820',
        'text-secondary': '#55606F',
        'text-muted': '#64707F', // 4.62:1 on `bg` — passes WCAG AA (was #8991A0 at 2.91:1, a fail)
        'text-invert': '#F3F4F6',
        'text-invert-muted': '#9BA4B2',
        hairline: '#D4D8DD',
        'hairline-dark': '#35414E',
        brand: '#07589C',
        'brand-dark': '#054373',
        accent: '#D7192D',
        'accent-dark': '#B01323',
        success: '#1E7A46',
        warning: '#B7791F',
        error: '#C0392B',
      },
      fontFamily: {
        // One highly readable sans-serif family for all body copy and
        // headings — Inter, chosen for legibility at small sizes and broad
        // trust across a general Indian business audience. IBM Plex Mono
        // stays as a restrained accent for kickers/labels/codes only.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      maxWidth: {
        container: '1240px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '8px',
        xl: '10px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(18,21,27,0.04)',
        elevated: '0 12px 32px -16px rgba(18,21,27,0.16)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.22,.9,.3,1)',
      },
      keyframes: {
        // Track is 3 copies of the content wide (see TrustStrip.jsx) so a
        // repeat is never visible on-screen at the same time as the
        // original, even on an ultrawide monitor — -33.333% is one copy.
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.3333%)' },
        },
      },
      animation: {
        // Duration is deliberately slow — a trust strip should read as calm
        // background motion, not a ticker demanding attention. Global
        // prefers-reduced-motion override in index.css freezes this too.
        // Retuned for the 4-item trust bar — shorter track, shorter
        // duration, same steady px/s pace as before.
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};
