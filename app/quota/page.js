export const dynamic = "force-dynamic";

export default function QuotaPage() {
  return (
    <main className="panel">
      <section className="card">
        <h2>Database quota reached</h2>
        <p className="hint">
          The free Firestore read limit for today is used up. This is a daily limit on the database, so the inventory cannot load until it resets.
        </p>
        <p className="hint">Try again after 3:00 PM. Refresh this page after that.</p>
      </section>
    </main>
  );
}
