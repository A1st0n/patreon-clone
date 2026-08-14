export const metadata = { title: 'Terms of Service · Patronage' };

// TEMPLATE, NOT LEGAL ADVICE. A lawyer in your jurisdiction has to read this
// before you take a single payment. The bracketed bits are yours to fill in.
export default function Terms() {
  return (
    <div className="wrap prose">
      <header className="head">
        <h1>Terms of Service</h1>
        <p className="sub">Last updated: 13 August 2026</p>
      </header>

      <h2>1. Who we are</h2>
      <p>
        Patronage (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by [LEGAL ENTITY], [ADDRESS],
        contact <a href="mailto:support@patronage.demo">support@patronage.demo</a>. By creating an
        account you agree to these terms.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must be at least 18, or the age of majority where you live, to hold an account. You are
        responsible for what happens under your login. Tell us promptly if you believe it has been
        used without your permission.
      </p>

      <h2>3. Memberships and payment</h2>
      <p>
        A membership is a recurring monthly subscription to a specific creator, billed in advance
        through Stripe. We never see or store your card number. Prices are set by the creator and
        shown before you confirm.
      </p>
      <p>
        <strong>Cancellation.</strong> You can cancel at any time from Billing in your account.
        Cancellation stops future charges; you keep access until the end of the period you have
        already paid for.
      </p>
      <p>
        <strong>Refunds.</strong> [STATE YOUR POLICY. If you sell to consumers in the UK/EU you must
        also honour the statutory withdrawal rights, which this line does not replace.]
      </p>

      <h2>4. Creator content</h2>
      <p>
        Creators own what they post and grant us the licence needed to host and show it to their
        patrons. We do not vet content before it appears. Creators are responsible for having the
        rights to everything they publish.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        No illegal content, no content that infringes someone else&rsquo;s rights, no harassment, no
        malware, no attempts to break, overload, or gain unauthorised access to the service. We may
        suspend accounts that do these things.
      </p>

      <h2>6. Sharing paid content</h2>
      <p>
        Members-only posts are for you. Republishing or redistributing them outside the service is a
        breach of these terms and may also infringe the creator&rsquo;s copyright.
      </p>

      <h2>7. Ending the agreement</h2>
      <p>
        You may close your account at any time. We may suspend or close an account that breaches
        these terms, and will tell you why unless the law prevents us.
      </p>

      <h2>8. Liability</h2>
      <p>
        [STANDARD LIMITATION CLAUSE — jurisdiction specific. Note that liability for death, personal
        injury, and fraud cannot be excluded in many jurisdictions, including the UK.]
      </p>

      <h2>9. Changes</h2>
      <p>
        We will post material changes here and email account holders before they take effect.
      </p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of [JURISDICTION].</p>
    </div>
  );
}
