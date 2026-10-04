export default function Shell({ children }) {
  return (
    <div className="stage">
      <aside className="brand">
        <div>
          <img className="brand-logo brand-logo-large" src="/logo.jpg" alt="" />
          <p className="eyebrow">PRO 4A</p>
          <h1>ICT Inventory Management System</h1>
          <p className="lede">
            Use the username and password assigned to your office or station.
          </p>
        </div>
      </aside>
      <main className="panel">{children}</main>
    </div>
  );
}
