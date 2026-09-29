"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";

function grouped(secret) {
  return String(secret || "").replace(/(.{4})/g, "$1 ").trim();
}

export default function SetupForm() {
  const router = useRouter();
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/2fa/setup")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (!data.ok) setError(data.error || "Could not start authenticator setup.");
        else setSetup(data);
      })
      .catch(() => {
        if (active) setError("Could not start authenticator setup.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/2fa/enable", {
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
        <h2>Set up authenticator</h2>
        <p className="hint">
          Scan the QR code with Google Authenticator, Microsoft Authenticator, or another authenticator app. Then enter the 6-digit code.
        </p>
        {setup ? (
          <div className="qr-wrap">
            <img src={setup.qrDataUrl} alt="Authenticator QR code" />
            <p className="fine">Or enter this key manually</p>
            <p className="secret">{grouped(setup.secret)}</p>
          </div>
        ) : (
          <p className="hint">Preparing the QR code…</p>
        )}
        <form onSubmit={onSubmit}>
          <label>
            Authenticator code
            <input className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" required />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy || !setup}>{busy ? "Checking…" : "Enable authenticator"}</button>
        </form>
      </section>
    </Shell>
  );
}
