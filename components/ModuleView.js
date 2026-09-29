export default function ModuleView({ page }) {
  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">{page.group}</p>
        <h1>{page.title}</h1>
      </header>
      <section className="panel-card">
        <p className="hint">{page.text}</p>
      </section>
    </div>
  );
}
