export const metadata = { title: 'Accessibility · Patronage' };

// A statement is not a defence; the app being usable is. Keep the "known gaps"
// list truthful — an accurate statement with open items reads far better than a
// blanket "we are fully compliant" that a five-minute audit disproves.
export default function Accessibility() {
  return (
    <div className="wrap prose">
      <header className="head">
        <h1>Accessibility</h1>
        <p className="sub">Last updated: 13 August 2026</p>
      </header>

      <h2>Our aim</h2>
      <p>
        We aim to meet <strong>WCAG 2.1 Level AA</strong>. That is the standard referenced by the
        ADA in US case law, by the European Accessibility Act, and by the UK Equality Act.
      </p>

      <h2>What we have done</h2>
      <ul>
        <li>Every page works with a keyboard alone, with a visible focus ring on each control.</li>
        <li>A &ldquo;Skip to content&rdquo; link is the first tab stop, so you can jump past the nav.</li>
        <li>Text meets the 4.5:1 contrast minimum in both light and dark themes.</li>
        <li>Dialogs use the browser&rsquo;s native dialog: Escape closes them and focus stays inside.</li>
        <li>Errors are announced to screen readers rather than only appearing in colour.</li>
        <li>Icon-only buttons carry text labels; images carry alternative text.</li>
        <li>Decorative animation stops when your system asks for reduced motion.</li>
        <li>Layout reflows to 320px and survives 200% zoom without loss of content.</li>
      </ul>

      <h2>Known gaps</h2>
      <ul>
        <li>The image editor is drag-based and is not yet operable by keyboard alone.</li>
        <li>Alternative text on member uploads is generated from the caption; creators cannot yet write their own.</li>
        <li>Uploaded video has no captions, and we do not currently require them.</li>
      </ul>
      <p>These are being worked on. Until they ship, contact us and we will help directly.</p>

      <h2>Tell us about a barrier</h2>
      <p>
        Email <a href="mailto:access@patronage.demo">access@patronage.demo</a> and describe what you
        were trying to do. We aim to reply within 5 working days. If our reply does not resolve it,
        you can escalate to [YOUR NATIONAL ENFORCEMENT BODY].
      </p>
    </div>
  );
}
