"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import SignOutButton from "@/components/SignOutButton";
import { navigation } from "@/lib/navigation";

function isCurrent(pathname, href) {
  return pathname === href;
}

export default function AppShell({ user, alerts = [], children }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const menu = navigation.filter((item) => item.href !== "/accounts" || user?.role !== "encoder");
  const [groups, setGroups] = useState({
    Inventory: true,
  });

  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
    setAlertsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setAlertsOpen(false);
        setNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={navOpen ? "shell nav-open" : "shell"}>
      <aside className="side">
        <div className="side-brand">
          <img className="brand-logo" src="/logo.jpg" alt="" />
          <strong>PRO 4A - ICT Inventory Management System</strong>
        </div>
        <nav className="side-nav" aria-label="Main">
          {menu.map((item) =>
            item.children ? (
              <div key={item.label} className="side-group">
                <div className={groups[item.label] ? "side-group-btn open" : "side-group-btn"}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="side-group-link"
                      aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="side-group-link"
                      onClick={() => setGroups((current) => ({ ...current, [item.label]: !current[item.label] }))}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="side-chevron"
                    aria-label={`${groups[item.label] ? "Collapse" : "Expand"} ${item.label}`}
                    aria-expanded={groups[item.label] ? "true" : "false"}
                    onClick={() => setGroups((current) => ({ ...current, [item.label]: !current[item.label] }))}
                  >
                    <Icon name="chevron" />
                  </button>
                </div>
                {groups[item.label] ? (
                  <div className="side-sub">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={isCurrent(pathname, child.href) ? "page" : undefined}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="side-link"
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>
        <SignOutButton className="side-link side-logout">
          <Icon name="logout" />
          <span>Log-out</span>
        </SignOutButton>
      </aside>

      {navOpen ? <button className="backdrop" type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} /> : null}

      <header className="appbar">
        <button className="icon-btn menu-btn" type="button" aria-label="Open menu" onClick={() => setNavOpen(true)}>
          <Icon name="menu" />
        </button>
        <p className="app-title">PRO 4A - ICT Inventory Management System</p>
        <div className="app-tools">
          <div className="pop">
            <button
              className="icon-btn"
              type="button"
              aria-label="Needs attention"
              aria-expanded={alertsOpen}
              onClick={() => {
                setAlertsOpen((open) => !open);
                setAccountOpen(false);
              }}
            >
              <Icon name="bell" />
              <span className="badge">{alerts.reduce((sum, item) => sum + item.count, 0)}</span>
            </button>
            {alertsOpen ? (
              <div className="pop-panel" role="menu">
                <p className="pop-title">Needs attention</p>
                {alerts.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="pop">
            <button
              className="account-btn"
              type="button"
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen((open) => !open);
                setAlertsOpen(false);
              }}
            >
              <span className="avatar">{String(user.displayName || "U").slice(0, 1)}</span>
              <span>{user.displayName}</span>
              <Icon name="chevron" />
            </button>
            {accountOpen ? (
              <div className="pop-panel account-panel">
                <p className="pop-title">{user.access || (user.role === "assistant-admin" ? "Assistant Admin" : "Encoder")}</p>
                <p className="account-email">{user.username}</p>
                {passwordOpen ? (
                  <form
                    className="password-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setPasswordError("");
                      setPasswordNotice("");
                      setPasswordBusy(true);
                      try {
                        const response = await fetch("/api/password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(passwordForm),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          setPasswordError(data.error || "Could not change the password.");
                          return;
                        }
                        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        setPasswordNotice("Password changed.");
                        setPasswordOpen(false);
                      } catch {
                        setPasswordError("Could not change the password.");
                      } finally {
                        setPasswordBusy(false);
                      }
                    }}
                  >
                    <label>
                      Current password
                      <input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} required />
                    </label>
                    <label>
                      New password
                      <input type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} required />
                    </label>
                    <label>
                      Confirm password
                      <input type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
                    </label>
                    {passwordError ? <p className="error">{passwordError}</p> : null}
                    <button type="submit" disabled={passwordBusy}>{passwordBusy ? "Saving…" : "Save password"}</button>
                    <button className="ghost" type="button" onClick={() => { setPasswordOpen(false); setPasswordError(""); }}>Cancel</button>
                  </form>
                ) : (
                  <button
                    className="side-link"
                    type="button"
                    onClick={() => {
                      setPasswordOpen(true);
                      setPasswordError("");
                      setPasswordNotice("");
                    }}
                  >
                    Change Password
                  </button>
                )}
                {passwordNotice ? <p className="account-email">{passwordNotice}</p> : null}
                <SignOutButton className="side-link">Sign out</SignOutButton>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="canvas">{children}</main>
    </div>
  );
}
