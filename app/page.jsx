'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

// Interactive 3D tilt, pure CSS transform, no 3D library.
function tilt(e) {
  const c = e.currentTarget, r = c.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  c.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
}
const untilt = (e) => { e.currentTarget.style.transform = ''; };

// ponytail: seed renders instantly (no waiting on the placeholder Supabase,
// which was the slow-load). Real DB rows override it if the fetch succeeds.
const SEED = [
  { id: 's1', name: 'Ada Paints', bio: 'Weekly watercolor studies.', price_cents: 500 },
  { id: 's2', name: 'Lo-Fi Lab', bio: 'Ambient tracks + stems.', price_cents: 800 },
  { id: 's3', name: 'The Rust Diaries', bio: 'Deep-dive systems essays.', price_cents: 1200 },
];

export default function Home() {
  const [creators, setCreators] = useState(SEED);
  const [modal, setModal] = useState(null); // replaces window.alert
  const router = useRouter();

  useEffect(() => {
    supabase.from('creators').select('*')
      .then(({ data }) => { if (data?.length) setCreators(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="wrap">
      <Heart onClick={() => setModal('Thanks for the love.')} />

      <header className="head">
        <h1>Patronage</h1>
        <p className="sub">Back the creators you love. Monthly.</p>
      </header>

      <div className="row" style={{ marginBottom: 72 }}>
        <input placeholder="you@email.com" />
        {/* ponytail: login flow ditched, just route to /account */}
        <button className="btn-link tip" data-tip="Go to your account"
                onClick={() => router.push('/account')}>Sign in</button>
      </div>

      <div className="grid">
        {creators.map((c) => (
          <div key={c.id} className="card" onMouseMove={tilt} onMouseLeave={untilt}>
            <h3>{c.name}</h3>
            <p>{c.bio}</p>
            <div className="row">
              <span className="price">${(c.price_cents / 100).toFixed(2)}<span className="per">/mo</span></span>
              <button className="btn tip" data-tip={`Support ${c.name}`}
                      onClick={() => router.push('/account')}>Become a patron</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p>{modal}</p>
            <button className="btn" onClick={() => setModal(null)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pink 3D interactive heart, SVG + CSS tilt, pops on click. No 3D lib.
function Heart({ onClick }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      className={`heart tip ${pop ? 'pop' : ''}`}
      data-tip="Show some love"
      aria-label="Show some love"
      onMouseMove={tilt}
      onMouseLeave={untilt}
      onClick={() => { setPop(true); setTimeout(() => setPop(false), 300); onClick?.(); }}
    >
      <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff87ab" />
            <stop offset="1" stopColor="#ef3f6e" />
          </linearGradient>
          <radialGradient id="hs" cx="0.32" cy="0.28" r="0.42">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path fill="url(#hg)" stroke="#d62e5c" strokeWidth="0.6"
              d="M12 21s-7.5-4.9-10-9.5C.6 8.6 2.1 5 5.5 5 7.6 5 9 6.3 12 9c3-2.7 4.4-4 6.5-4C21.9 5 23.4 8.6 22 11.5 19.5 16.1 12 21 12 21z" />
        <path fill="none" stroke="#ffb3c8" strokeWidth="0.7" strokeLinecap="round" opacity="0.7"
              d="M5.2 7.2C4 7.7 3.4 8.9 3.6 10.3" />
        <ellipse cx="8" cy="8.6" rx="2.7" ry="1.8" fill="url(#hs)" transform="rotate(-32 8 8.6)" />
        <circle cx="15.4" cy="7.6" r="0.75" fill="#ffffff" opacity="0.75" />
        <circle cx="17.2" cy="9.4" r="0.4" fill="#ffffff" opacity="0.6" />
      </svg>
    </button>
  );
}
