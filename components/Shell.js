export default function Shell({ children }) {
  return (
    <div className="stage">
      <aside className="brand">
        <div>
          <div className="mark">ICT</div>
          <p className="eyebrow">Equipment inventory</p>
          <h1>Sign in to the equipment records.</h1>
          <p className="lede">
            Use the username and password assigned to your office or station.
          </p>
        </div>
      </aside>
      <main className="panel">{children}</main>
    </div>
  );
}
