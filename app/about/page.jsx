export default function About() {
  return (
    <div className="wrap">
      <header className="head">
        <h1>About</h1>
        <p className="sub">A tiny Patreon clone, demo only.</p>
      </header>
      <p style={{ maxWidth: 560, color: 'var(--muted)', fontSize: 18 }}>
        Built with Next.js, Supabase, and Stripe. Memberships are monthly,
        payments run through Stripe Checkout, and the webhook records who backed
        whom. Not affiliated with Patreon.
      </p>
    </div>
  );
}
