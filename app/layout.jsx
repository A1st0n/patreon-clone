import './globals.css';

export const metadata = { title: 'Patronage', description: 'A tiny Patreon clone' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
