"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

export default function AuthScreen() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      setError(data.error || "Sign-in failed.");
      return;
    }

    router.push("/home");
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
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button>
        </form>
      </section>
    </Shell>
  );
}
