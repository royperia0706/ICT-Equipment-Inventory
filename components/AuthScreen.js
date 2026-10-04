"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { formatClock } from "@/lib/lockout";

export default function AuthScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!wait) return undefined;
    const timer = setInterval(() => setWait((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [wait]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok || !data.ok) {
      setWait(Number(data.retryAfter) || 0);
      setError(data.error || "Sign-in failed.");
      return;
    }

    router.push(data.step === "reset-password" ? "/reset-password" : "/home");
    router.refresh();
  }

  return (
    <Shell>
      <section className="card">
        <h2>Sign in</h2>
        <p className="hint">Use the username and password assigned to your office or station.</p>
        <form onSubmit={onSubmit}>
          <label>
            Username
            <input name="username" type="text" autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" />
          </label>
          {error ? <p className="error" role="alert">{wait > 0 ? `Too many failed attempts. Try again in ${formatClock(wait)}.` : error}</p> : null}
          <button type="submit" disabled={busy || wait > 0}>{busy ? "Please wait…" : "Sign in"}</button>
        </form>
      </section>
    </Shell>
  );
}
