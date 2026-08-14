'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '../../lib/session';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  // ponytail: plain URLSearchParams — useSearchParams would need a Suspense wrapper
  useEffect(() => { setEmail(new URLSearchParams(location.search).get('email') || ''); }, []);

  async function submit(e) {
    e.preventDefault();
    try { await signUp(email, password); router.push('/feed'); router.refresh(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="wrap">
      <header className="head">
        <h1>Join Patronage</h1>
        <p className="sub">Free to start. Pay only the creators you back.</p>
      </header>

      <form className="card auth" onSubmit={submit}>
        <label className="field">Email
          <input type="email" required value={email} placeholder="you@email.com"
                 onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        </label>
        <label className="field">Password
          <input type="password" required minLength={8} value={password}
                 onChange={(e) => { setPassword(e.target.value); setErr(''); }} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" type="submit">Create free account</button>
        <p className="muted">
          Already a member? <Link className="foot-link" href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
