"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IdleLogout from "@/components/IdleLogout";
import Shell from "@/components/Shell";

export default function ResetPasswordForm({ username }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "Could not save the new password.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <Shell>
      <IdleLogout />
      <section className="card">
        <h2>Set a new password</h2>
        <p className="hint">This account was unblocked. Choose a new password for {username} before continuing.</p>
        <form onSubmit={onSubmit}>
          <label>
            New password
            <input name="newPassword" type="password" autoComplete="new-password" minLength={4} required />
          </label>
          <label>
            Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={4} required />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : "Save password"}</button>
        </form>
      </section>
    </Shell>
  );
}
