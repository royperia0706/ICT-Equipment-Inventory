"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

export default function AuthScreen({ firstRun }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (firstRun && password !== confirm) {
      setBusy(false);
      setError("The passwords do not match.");
      return;
    }

    const response = await fetch(firstRun ? "/api/setup-admin" : "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.get("displayName"),
        email: form.get("email"),
        password,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok || !data.ok) {
      setError(data.error || "Sign-in failed.");
      return;
    }

    router.push(data.step === "verified" ? "/home" : data.step === "verify" ? "/verify" : "/setup");
    router.refresh();
  }

  return (
    <Shell step={1}>
      <section className="card">
        <h2>{firstRun ? "Create administrator" : "Sign in"}</h2>
        <p className="hint">
          {firstRun
            ? "This first account manages the system. After it is created, sign-in requires an authenticator app."
            : "Use the administrator email and password, then confirm with your authenticator."}
        </p>
        <form onSubmit={onSubmit}>
          {firstRun ? (
            <label>
              Full name
              <input name="displayName" autoComplete="name" />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="text" autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete={firstRun ? "new-password" : "current-password"} />
          </label>
          {firstRun ? (
            <label>
              Confirm password
              <input name="confirm" type="password" autoComplete="new-password" />
            </label>
          ) : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : firstRun ? "Create account" : "Continue"}</button>
        </form>
      </section>
    </Shell>
  );
}
