'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadSession, loadUsers, viewAs, canPost, isAdmin, ROLES } from '../../lib/session';
import { listPosts, updatePost, deletePost } from '../../lib/db';
import { isConfigured } from '../../lib/supabase';
import { summarise, loadMembers } from '../../lib/analytics';

// ponytail: one page, two views — creators see their own numbers, admins see
// everyone's plus the member roster and a delete on any post. Every capability
// a creator has, an admin has too; admin simply adds oversight on top.
const money = (c) => '$' + (c / 100).toFixed(2);

export default function Admin() {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);

  const refresh = () => listPosts().then(setPosts).catch(() => setPosts([]));
  useEffect(() => {
    setSession(loadSession());
    const u = loadUsers();
    setUsers(u);
    refresh();
    Promise.all([listPosts().catch(() => []), loadMembers(u)])
      .then(([ps, ms]) => setStats(summarise(ms, ps)))
      .catch(() => setStats(null));
  }, []);

  if (session === null) return <div className="wrap" />;
  const role = session?.role;
  if (!canPost(role)) {
    return (
      <div className="wrap">
        <header className="head"><h1>Not your dashboard</h1>
          <p className="sub">Sign in as a creator or admin to see this page.</p></header>
        <div className="card" style={{ textAlign: 'center' }}>
          <Link className="btn" href="/login">Sign in</Link>
        </div>
      </div>
    );
  }

  const admin = isAdmin(role);
  // RLS lets an admin through; a creator only ever touches their own rows.
  const del = (id) => deletePost(id).then(refresh);
  const edit = (id, patch) => updatePost(id, patch).then(refresh);
  const switchTo = (r) => { viewAs(r); location.href = '/feed'; };

  // Troubleshooting: what's actually in this browser, and a way to reset it.
  const bytes = Object.keys(localStorage)
    .filter((k) => k.startsWith('patronage_'))
    .reduce((n, k) => n + k.length + localStorage[k].length, 0);
  const wipe = (k) => { if (confirm(`Clear ${k}?`)) { localStorage.removeItem(k); location.reload(); } };

  return (
    <div className="wrap">
      <header className="head">
        <h1>{admin ? 'Admin' : 'Creator studio'}</h1>
        <p className="sub">Signed in as {session.email}.</p>
      </header>

      {/* Real aggregates now — MRR is summed from memberships and their tier
          prices, not a constant multiplied by a headcount. */}
      <div className="stats card">
        <div><b>{money(stats?.mrr || 0)}</b><span className="muted">MRR</span></div>
        <div><b>{stats?.active || 0}</b><span className="muted">Active patrons</span></div>
        <div><b>+{stats?.gained || 0}</b><span className="muted">New (30d)</span></div>
        <div><b>−{stats?.lost || 0}</b><span className="muted">Churned (30d)</span></div>
        <div><b>{stats?.churn || 0}%</b><span className="muted">Churn rate</span></div>
        <div><b>{stats?.paused || 0}</b><span className="muted">Paused</span></div>
        <div><b>{posts.filter((p) => !p.draft).length}</b><span className="muted">Published</span></div>
        <div><b>{posts.filter((p) => p.draft).length}</b><span className="muted">Drafts</span></div>
      </div>

      <div className="card">
        <h3>Tiers</h3>
        <table className="bill">
          <thead><tr><th>Tier</th><th>Patrons</th><th>Perks</th></tr></thead>
          <tbody>
            {(stats?.byTier || []).map((t) => (
              <tr key={t.rank}><td>{t.name}</td><td>{t.count}</td><td>{t.perks}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Top posts</h3>
        {(stats?.top || []).map((p) => (
          <div key={p.id} className="act-row">
            <span className="muted">{new Date(p.ts).toLocaleDateString()}</span>
            <span>{(p.caption || p.teaser || 'media post').slice(0, 48)}</span>
            <span className="muted">{p.likes || 0} likes · {p.comments?.length || 0} comments</span>
          </div>
        ))}
        {!stats?.top?.length && <p className="muted">No published posts yet.</p>}
      </div>

      {admin && (
        <div className="card">
          <h3>Members</h3>
          <table className="bill">
            <thead><tr><th>Email</th><th>Role</th><th>Last seen</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td><td>{u.role}</td>
                  <td>{u.seen ? new Date(u.seen).toLocaleDateString() : 'never'}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={3}>No sign-ins yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}


      <div className="card">
        <h3>{admin ? 'All posts' : 'Your posts'}</h3>
        {posts.map((p) => (
          <div key={p.id} className="act-row">
            <span className="muted">
              {p.draft ? (p.at ? `Scheduled ${new Date(p.at).toLocaleString()}` : 'Draft')
                       : new Date(p.ts).toLocaleDateString()}
            </span>
            <span>{p.locked ? '🔒 ' : ''}{(p.caption || 'media post').slice(0, 48)}</span>
            <button className="btn-link" onClick={() => edit(p.id, { locked: !p.locked })}>
              {p.locked ? 'Unlock' : 'Lock'}
            </button>
            <button className="btn-link" onClick={() => edit(p.id, { draft: !p.draft, at: null })}>
              {p.draft ? 'Publish' : 'Unpublish'}
            </button>
            <button className="btn-link del" onClick={() => del(p.id)}>Delete</button>
          </div>
        ))}
        {posts.length === 0 && <p className="muted">Nothing posted yet.</p>}
      </div>

      {admin && (
        <div className="card">
          <h3>Troubleshooting</h3>
          <p className="muted">
            {(bytes / 1024).toFixed(1)} KB of ~5 MB browser storage used by this demo.
          </p>
          <div className="row">
            {(isConfigured ? ['patronage_social', 'patronage_profile']
                           : ['patronage_posts', 'patronage_users', 'patronage_profile']).map((k) => (
              <button key={k} className="btn-link del" onClick={() => wipe(k)}>Clear {k.slice(10)}</button>
            ))}
          </div>
          {/* ponytail: <details> + JSON.stringify is the whole inspector */}
          <details className="faq">
            <summary>Raw storage</summary>
            <pre style={{ overflow: 'auto', maxHeight: 300, fontSize: 12 }}>
              {JSON.stringify({ session, users, posts }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {admin && (
        <div className="card">
          <h3>View as</h3>
          <p className="muted">Switch this browser to another role to check what they see.</p>
          <div className="row">
            {ROLES.map(([id, label]) => (
              <button key={id} className="btn-link" onClick={() => switchTo(id)}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
