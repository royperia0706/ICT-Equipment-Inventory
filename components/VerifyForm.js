"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

export default function VerifyForm({ email }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: form.get("code") }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error || "That code was not accepted.");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <Shell step={2}>
      <section className="card">
        <h2>Authenticator code</h2>
        <p className="hint">Enter the 6-digit code for {email} from your authenticator app.</p>
        <form onSubmit={onSubmit}>
          <label>
            Code
            <input className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" required />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
        </form>
      </section>
    </Shell>
  );
}
