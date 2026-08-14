export const metadata = { title: 'Privacy Policy · Patronage' };

// TEMPLATE, NOT LEGAL ADVICE. This describes what the code in this repo
// actually does — keep it honest as the code changes, or it becomes a lie you
// published. GDPR/UK GDPR and CCPA both require accuracy, not just a page.
export default function Privacy() {
  return (
    <div className="wrap prose">
      <header className="head">
        <h1>Privacy Policy</h1>
        <p className="sub">Last updated: 13 August 2026</p>
      </header>

      <h2>Who is responsible</h2>
      <p>
        [LEGAL ENTITY], [ADDRESS] is the data controller. Questions or requests:{' '}
        <a href="mailto:privacy@patronage.demo">privacy@patronage.demo</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address and password hash, held by Supabase Auth.</li>
        <li><strong>Profile:</strong> display name, handle, bio, and avatar, if you add them.</li>
        <li><strong>Content:</strong> posts, comments, and uploads you create.</li>
        <li><strong>Memberships:</strong> which creators you back and whether the subscription is active.</li>
        <li><strong>Payment:</strong> handled by Stripe. We store Stripe&rsquo;s identifiers, never your card details.</li>
        <li><strong>On your device:</strong> theme, language, and interface preferences in localStorage.</li>
      </ul>

      <h2>Why, and on what basis</h2>
      <p>
        To run your account and show you what you paid for (performance of our contract with you),
        to take payment and keep tax records (legal obligation), and to keep the service secure and
        working (legitimate interests). We do not sell personal data and we do not run advertising
        trackers.
      </p>

      <h2>Who else sees it</h2>
      <p>
        Our processors: Supabase (database and authentication), Vercel (hosting), and Stripe
        (payments). Creators see that you are a patron; they do not see your payment details.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account and content data until you delete your account, then removal within 30 days except
        where records must be kept longer — payment records are typically retained [N] years for tax.
      </p>

      <h2>Your rights</h2>
      <p>
        Access, correction, deletion, portability, and objection to processing based on legitimate
        interests. Email us and we will respond within one month. If you are in the UK or EU you may
        also complain to your data protection authority.
      </p>

      <h2>Cookies</h2>
      <p>
        A session cookie keeps you signed in and Stripe sets cookies during checkout for fraud
        prevention. Both are strictly necessary, so no consent banner is required. If you add
        analytics later, this section and a consent banner both need to change.
      </p>

      <h2>International transfers</h2>
      <p>
        Our providers may process data outside your country under standard contractual clauses.
        [CONFIRM YOUR REGION SETTINGS IN SUPABASE AND VERCEL.]
      </p>
    </div>
  );
}
