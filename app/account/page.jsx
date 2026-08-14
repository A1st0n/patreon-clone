'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadProfile, saveProfile } from '../../lib/profile';
import { loadTheme, applyTheme } from '../../lib/theme';

const fileToDataUrl = (file) =>
  new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });

const SECTIONS = [
  ['profile', 'Profile'], ['appearance', 'Appearance'], ['billing', 'Billing'],
  ['language', 'Language'], ['activity', 'Activity'], ['faq', 'FAQ'], ['help', 'Help'],
];

import { LANGS, loadLang, applyLang } from '../../lib/i18n';

export default function Account() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [theme, setTheme] = useState('system');
  const [lang, setLang] = useState('en');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    setProfile(loadProfile());
    setTheme(loadTheme());
    setLang(loadLang());
    try { setPosts(JSON.parse(localStorage.getItem('patronage_posts')) || []); } catch { setPosts([]); }
  }, []);

  if (!profile) return <div className="wrap" />;

  function startEdit() { setDraft({ ...profile }); setEditing(true); }
  async function pickPfp(e) {
    const f = e.target.files?.[0];
    if (f) setDraft({ ...draft, pfp: await fileToDataUrl(f) });
  }
  function save(e) {
    e.preventDefault();
    const next = { ...draft, name: draft.name.trim() || 'You' };
    saveProfile(next); setProfile(next); setEditing(false);
  }
  function pickTheme(t) { setTheme(t); applyTheme(t); }
  // Reload so every already-rendered label re-runs t() with the new language.
  function pickLang(l) { setLang(l); applyLang(l); location.reload(); }

  const likes = posts.filter((p) => p.liked).length;
  const saved = posts.filter((p) => p.bookmarked).length;
  const comments = posts.reduce((n, p) => n + (p.comments?.length || 0), 0);

  return (
    <div className="wrap">
      <header className="head">
        <h1>Your account</h1>
        <p className="sub">Profile, preferences, and support.</p>
      </header>

      <div className="settings">
        <nav className="side">
          {SECTIONS.map(([id, label]) => (
            <button key={id} className={'side-tab' + (tab === id ? ' on' : '')}
                    onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        <div className="panel">
          {tab === 'profile' && (!editing ? (
            <div className="card profile">
              <img className="pfp-lg" src={profile.pfp} alt={profile.name} />
              <div className="profile-name">{profile.name}</div>
              <div className="muted">{profile.handle}</div>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              <button className="btn" onClick={startEdit}>Edit profile</button>
            </div>
          ) : (
            <form className="card profile" onSubmit={save}>
              <label className="pfp-pick" title="Change profile picture">
                <img className="pfp-lg" src={draft.pfp} alt="" />
                <input type="file" accept="image/*" hidden onChange={pickPfp} />
              </label>
              <label className="field">Name
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="field">Handle
                <input value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value })} />
              </label>
              <label className="field">Bio
                <textarea rows={3} value={draft.bio}
                          onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </label>
              <div className="row">
                <button className="btn" type="submit">Save</button>
                <button className="btn-link" type="button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ))}

          {tab === 'appearance' && (
            <div className="card">
              <h3>Appearance</h3>
              <p className="muted">Choose how Patronage looks on this device.</p>
              <div className="swatches">
                {[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']].map(([id, label]) => (
                  <button key={id} className={'swatch ' + id + (theme === id ? ' on' : '')}
                          onClick={() => pickTheme(id)}>
                    <span className="swatch-chip" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="card">
              <h3>Billing</h3>
              <p className="muted">You are on the free plan. No card on file.</p>
              <table className="bill">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
                <tbody>
                  <tr><td>No invoices yet</td><td>—</td><td>—</td></tr>
                </tbody>
              </table>
              {/* ponytail: real portal needs live Stripe keys; link is the stub */}
              <button className="btn" onClick={() => window.open('https://billing.stripe.com', '_blank')}>
                Manage billing
              </button>
            </div>
          )}

          {tab === 'language' && (
            <div className="card">
              <h3>Language</h3>
              <p className="muted">Preferred language for your account.</p>
              <div className="langs">
                {LANGS.map(([id, label]) => (
                  <button key={id} className={'lang' + (lang === id ? ' on' : '')}
                          onClick={() => pickLang(id)}>{label}</button>
                ))}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="card">
              <h3>Activity</h3>
              <div className="stats">
                <div><b>{posts.length}</b><span className="muted">Posts</span></div>
                <div><b>{likes}</b><span className="muted">Likes</span></div>
                <div><b>{comments}</b><span className="muted">Comments</span></div>
                <div><b>{saved}</b><span className="muted">Bookmarks</span></div>
              </div>
              {posts.slice(0, 5).map((p) => (
                <div key={p.id} className="act-row">
                  <span className="muted">{new Date(p.ts).toLocaleDateString()}</span>
                  <span>Posted “{(p.caption || 'a photo').slice(0, 40)}”</span>
                </div>
              ))}
              {posts.length === 0 && <p className="muted">Nothing yet. Write a post on the feed.</p>}
            </div>
          )}

          {tab === 'faq' && (
            <div className="card">
              <h3>FAQ</h3>
              {[
                ['How do payments work?', 'Memberships are monthly and run through Stripe Checkout. You can cancel anytime.'],
                ['When are creators paid?', 'Payouts land on the first of each month for the previous cycle.'],
                ['Can I change my pledge?', 'Yes. Change or cancel from the Billing tab at any time.'],
                ['Is my data private?', 'Profile and posts in this demo are stored locally in your browser only.'],
              ].map(([q, a]) => (
                <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          )}

          {tab === 'help' && (
            <div className="card">
              <h3>Help</h3>
              <p className="muted">We usually reply within a day.</p>
              <div className="help-links">
                <a className="foot-link" href="mailto:support@patronage.demo">Email support</a>
                <Link className="foot-link" href="/about">Read the docs</Link>
                <a className="foot-link" href="https://status.stripe.com" target="_blank" rel="noreferrer">System status</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
