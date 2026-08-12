import Link from 'next/link';

const COLS = [
  ['Explore', [['Home', '/'], ['Explore', '/explore'], ['Feed', '/feed']]],
  ['Company', [['About', '/about'], ['Careers', '/about'], ['Blog', '/feed']]],
  ['Legal', [['Terms', '/about'], ['Privacy', '/about']]],
];

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-brand">
          <div className="foot-mark">Patronage</div>
          <p className="muted">Back the creators you love. Monthly.</p>
          <img src="/blossom.svg" alt="" className="foot-blossom" />
          <div className="foot-social">
            {[
              ['X', 'https://x.com'],
              ['Instagram', 'https://instagram.com'],
              ['GitHub', 'https://github.com'],
              ['Discord', 'https://discord.com'],
              ['Contact', 'mailto:hello@patronage.demo'],
            ].map(([label, href]) => (
              <a key={label} className="foot-link" href={href} target="_blank" rel="noreferrer">{label}</a>
            ))}
          </div>
        </div>
        <div className="foot-cols">
          {COLS.map(([title, links]) => (
            <div key={title} className="foot-col">
              <div className="foot-col-title">{title}</div>
              {links.map(([label, href]) => (
                <Link key={label + href} href={href} className="foot-link">{label}</Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="foot-bottom muted">
        © 2026 Patronage. A demo, not affiliated with Patreon.
      </div>
    </footer>
  );
}
