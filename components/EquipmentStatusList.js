function kindLabel(kind) {
  return kind === "Display" ? "Display/Projector" : (kind || "—");
}

export default function EquipmentStatusList({ title, text, records = [] }) {
  const rows = [...records].sort((a, b) => String(a.controlNumber || "").localeCompare(String(b.controlNumber || "")));

  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">{title}</p>
        <h1>{title}</h1>
      </header>
      <section className="panel-card">
        <p className="hint">{text}</p>
        {rows.length === 0 ? (
          <p className="filter-empty">No equipment matches this list.</p>
        ) : (
          <div className="computer-table-wrap">
            <table className="computer-table filter-table">
              <thead>
                <tr>
                  <th>Control Number</th>
                  <th>Inventory</th>
                  <th>Office</th>
                  <th>Station</th>
                  <th>Brand</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.controlNumber || `${row.kind}-${row.serialNumber}`}>
                    <td>{row.controlNumber || "—"}</td>
                    <td>{kindLabel(row.kind)}</td>
                    <td>{row.province || "—"}</td>
                    <td>{row.municipality || "—"}</td>
                    <td>{row.brand || "—"}</td>
                    <td>{row.serialNumber || "—"}</td>
                    <td>{row.status || "—"}</td>
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
