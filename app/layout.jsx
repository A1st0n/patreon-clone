import './globals.css';
import { Instrument_Serif } from 'next/font/google';
import Nav from './nav';
import Petals from './petals';
import Footer from './footer';

// One editorial display serif across the whole site.
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif', display: 'swap' });

export const metadata = { title: 'Patronage', description: 'A tiny Patreon clone' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={serif.variable} suppressHydrationWarning>
      <head>
        {/* Set theme before paint so there is no light flash on load */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('patronage_theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})()` }} />
      </head>
      <body>
        {/* First tab stop on every page: jump past the nav to the content */}
        <a className="skip" href="#main">Skip to content</a>
        <Petals />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
