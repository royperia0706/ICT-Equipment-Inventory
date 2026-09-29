export default function Shell({ step, children }) {
  const items = ["Email and password", "Authenticator code", "Open the system"];
  return (
    <div className="stage">
      <aside className="brand">
        <div>
          <div className="mark">ICT</div>
          <p className="eyebrow">Equipment inventory</p>
          <h1>Sign in to the equipment records.</h1>
          <p className="lede">
            Password first, then a code from an authenticator app such as Google Authenticator or Microsoft Authenticator.
          </p>
        </div>
        <ol className="steps">
          {items.map((label, index) => (
            <li key={label} className={index + 1 === step ? "current" : undefined}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>
      <main className="panel">{children}</main>
    </div>
  );
}
