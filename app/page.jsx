'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Interactive 3D tilt — pure CSS transform, no 3D library.
function tilt(e) {
  const c = e.currentTarget, r = c.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  c.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
}
const untilt = (e) => { e.currentTarget.style.transform = ''; };

export default function Home() {
  const [creators, setCreators] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.from('creators').select('*').then(({ data }) => setCreators(data || []));
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    // Magic link = no password UI to build. Supabase issues the expiring JWT.
    await supabase.auth.signInWithOtp({ email });
    alert('Check your email for a login link.');
  }

  async function join(creatorId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Sign in first.');
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ creatorId }),
    });
    const { url } = await res.json();
    window.location = url; // -> Stripe Checkout
  }

  return (
    <div className="wrap">
      <h1>Patronage</h1>
      <p className="sub">Back the creators you love. Monthly.</p>

      <div className="row" style={{ marginBottom: 48 }}>
        {user ? (
          <>
            <span>Signed in as {user.email}</span>
            <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </>
        ) : (
          <>
            <input placeholder="you@email.com" value={email}
                   onChange={(e) => setEmail(e.target.value)} />
            <button onClick={signIn}>Sign in</button>
          </>
        )}
      </div>

      <div className="grid">
        {creators.map((c) => (
          <div key={c.id} className="card" onMouseMove={tilt} onMouseLeave={untilt}>
            <h3>{c.name}</h3>
            <p>{c.bio}</p>
            <div className="row">
              <span className="price">${(c.price_cents / 100).toFixed(2)}/mo</span>
              <button onClick={() => join(c.id)}>Become a patron</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
