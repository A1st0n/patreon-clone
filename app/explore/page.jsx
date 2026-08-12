export default function Explore() {
  const cats = ['Art', 'Music', 'Writing', 'Podcasts', 'Games', 'Code'];
  return (
    <div className="wrap">
      <header className="head">
        <h1>Explore</h1>
        <p className="sub">Find creators worth backing.</p>
      </header>
      <div className="grid">
        {cats.map((c) => (
          <div key={c} className="card"><h3>{c}</h3><p>Browse {c.toLowerCase()} creators.</p></div>
        ))}
      </div>
    </div>
  );
}
