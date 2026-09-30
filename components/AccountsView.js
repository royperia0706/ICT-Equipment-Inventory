export default function AccountsView({ accounts = [] }) {
  return (
    <div className="dash computer-page">
      <header className="dash-head">
        <p className="kicker">Accounts</p>
        <h1>Accounts</h1>
      </header>
      <section className="panel-card">
        {accounts.length === 0 ? (
          <p className="hint">No accounts are loaded yet.</p>
        ) : (
          <div className="computer-table-wrap">
            <table className="computer-table">
              <thead>
                <tr>
                  <th>Office / Station</th>
                  <th>Classification</th>
                  <th>Username</th>
                  <th>Access</th>
                  <th>Office group</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.username}>
                    <td>{account.displayName}</td>
                    <td>{account.classification}</td>
                    <td>{account.username}</td>
                    <td>{account.access}</td>
                    <td>{account.unit}</td>
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
