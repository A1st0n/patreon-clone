'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, isAdmin } from '../../lib/session';
import { isConfigured } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const s = await signIn(email, password);
      router.push(isAdmin(s.role) ? '/admin' : '/feed');
      router.refresh();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="wrap">
      <header className="head">
        <h1>Sign in</h1>
        <p className="sub">Welcome back.</p>
      </header>

      <form className="card auth" onSubmit={submit}>
        <label className="field">Email
          {/* ponytail: no password in a demo — type="email" is the only check needed */}
          <input type="email" required value={email} placeholder="you@email.com"
                 onChange={(e) => { setEmail(e.target.value); setErr(''); }} />
        </label>
        <label className="field">Password
          <input type="password" value={password}
                 onChange={(e) => { setPassword(e.target.value); setErr(''); }} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" type="submit">Sign in</button>
        <p className="muted">
          No account? <Link className="foot-link" href="/signup">Sign up free</Link>
        </p>
        {!isConfigured && <p className="muted">
          Demo staff logins (no password): admin@patronage.demo · creator@patronage.demo
        </p>}
      </form>
    </div>
  );
}
