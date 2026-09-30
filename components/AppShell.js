"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import SignOutButton from "@/components/SignOutButton";
import { attention } from "@/lib/dashboard";
import { navigation } from "@/lib/navigation";

function isCurrent(pathname, href) {
  return pathname === href;
}

export default function AppShell({ user, children }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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
          <span className="mark">ICT</span>
          <strong>Equipment Inventory</strong>
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
        <p className="app-title">ICT Equipment Inventory System</p>
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
              <span className="badge">{attention.length}</span>
            </button>
            {alertsOpen ? (
              <div className="pop-panel" role="menu">
                <p className="pop-title">Needs attention</p>
                {attention.map((item) => (
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
