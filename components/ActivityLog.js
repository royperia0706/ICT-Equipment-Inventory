function when(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ActivityLog({ rows = [] }) {
  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">Activity Log</p>
        <h1>Activity Log</h1>
      </header>
      <section className="panel-card">
        <p className="hint">Every recorded action in the inventory, including adds, updates, approvals, and account changes.</p>
        {rows.length === 0 ? (
          <p className="filter-empty">No activity yet.</p>
        ) : (
          <div className="computer-table-wrap">
            <table className="computer-table filter-table">
              <thead>
                <tr>
                  <th>Date and time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Office</th>
                  <th>Station</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{when(row.at)}</td>
                    <td>{row.username || "—"}</td>
                    <td>{row.action || "—"}</td>
                    <td>{row.detail || "—"}</td>
                    <td>{row.province || "—"}</td>
                    <td>{row.municipality || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
