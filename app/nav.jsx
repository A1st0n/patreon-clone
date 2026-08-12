'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  ['/', 'Home'],
  ['/explore', 'Explore'],
  ['/feed', 'Feed'],
  ['/about', 'About'],
  ['/account', 'Account'],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        {/* ids differ from the hero heart's so the gradients don't collide */}
        <svg className="brand-heart" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="nhg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff87ab" />
              <stop offset="1" stopColor="#ef3f6e" />
            </linearGradient>
            <radialGradient id="nhs" cx="0.32" cy="0.28" r="0.42">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path fill="url(#nhg)" stroke="#d62e5c" strokeWidth="0.6"
                d="M12 21s-7.5-4.9-10-9.5C.6 8.6 2.1 5 5.5 5 7.6 5 9 6.3 12 9c3-2.7 4.4-4 6.5-4C21.9 5 23.4 8.6 22 11.5 19.5 16.1 12 21 12 21z" />
          <ellipse cx="8" cy="8.6" rx="2.7" ry="1.8" fill="url(#nhs)" transform="rotate(-32 8 8.6)" />
        </svg>
        Patronage
      </Link>
      <div className="tabs">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href}
                className={'tab' + (path === href ? ' active' : '')}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
