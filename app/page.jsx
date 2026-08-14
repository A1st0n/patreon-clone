'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isConfigured } from '../lib/supabase';
import { loadSession, setRole } from '../lib/session';
import { TIERS, priceFor, yearlyCents } from '../lib/tiers';

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
  const [email, setEmail] = useState('');
  const [yearly, setYearly] = useState(false);
  const dlg = useRef(null);
  const router = useRouter();

  useEffect(() => { if (modal) dlg.current?.showModal(); }, [modal]);

  // Configured: Stripe Checkout, and only its webhook can flip the role.
  // No keys: the demo shortcut, which is why the demo is not a paywall.
  async function back(c, tier) {
    const s = loadSession();
    if (!s) { router.push('/signup'); return; }
    if (!isConfigured) {
      setRole('paid', tier.rank);
      setModal(`You are now backing ${c.name} at the ${tier.name} tier${
        yearly ? ', billed yearly' : ''}. Members-only posts are unlocked.`);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token}` },
      // tierId, not a price: the amount is looked up server-side from the tier row
      body: JSON.stringify({ tierId: tier.id, interval: yearly ? 'year' : 'month' }),
    });
    const { url, error } = await res.json();
    if (url) location.href = url; else setModal(error || 'Checkout is unavailable.');
  }

  useEffect(() => {
    supabase.from('creators').select('*, tiers(id, name, price_cents, rank, perks)')
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
        <input placeholder="you@email.com" value={email}
               onChange={(e) => setEmail(e.target.value)} />
        {/* The email carries over so the hero form isn't a dead end */}
        <button className="btn tip" data-tip="Free account"
                onClick={() => router.push(`/signup?email=${encodeURIComponent(email)}`)}>Sign up</button>
        <button className="btn-link tip" data-tip="Already a member"
                onClick={() => router.push('/login')}>Sign in</button>
      </div>

      <div className="row" style={{ marginBottom: 28 }}>
        <button className={'chip' + (!yearly ? ' on' : '')} aria-pressed={!yearly}
                onClick={() => setYearly(false)}>Monthly</button>
        <button className={'chip' + (yearly ? ' on' : '')} aria-pressed={yearly}
                onClick={() => setYearly(true)}>Yearly · 2 months free</button>
      </div>

      <div className="grid">
        {creators.map((c) => (
          <div key={c.id} className="card" onMouseMove={tilt} onMouseLeave={untilt}>
            <h3>{c.name}</h3>
            <p>{c.bio}</p>
            {/* One card per creator, one row per tier. Prices derive from the
                creator's base price so a repriced creator moves every tier. */}
            {(c.tiers?.length ? c.tiers : TIERS.map((t) => ({
              ...t, id: `${c.id}-${t.rank}`, price_cents: priceFor(c.price_cents, t.rank),
            }))).map((t) => {
              const cents = yearly ? yearlyCents(t.price_cents) : t.price_cents;
              return (
                <div key={t.id} className="tier-row">
                  <div>
                    <div className="post-name">{t.name}</div>
                    <div className="muted" style={{ fontSize: 14 }}>{t.perks}</div>
                  </div>
                  <span className="price">
                    ${(cents / 100).toFixed(2)}<span className="per">/{yearly ? 'yr' : 'mo'}</span>
                  </span>
                  <button className="btn tip" data-tip={`Support ${c.name}`}
                          onClick={() => back(c, t)}>Join</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ponytail: native <dialog>. showModal() gives Escape, the focus trap,
          focus restore and role="dialog" free — none of it hand-rolled. */}
      <dialog className="dialog" ref={dlg} onClose={() => setModal(null)}>
        <p>{modal}</p>
        <button className="btn" onClick={() => dlg.current.close()}>Got it</button>
      </dialog>
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
