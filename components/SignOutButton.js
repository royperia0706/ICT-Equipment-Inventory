"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "ghost", children = "Sign out" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setConfirming(true)} disabled={busy}>
        {busy ? "Signing out…" : children}
      </button>
      {confirming ? (
        <div className="modal-back prompt-back" role="presentation" onClick={() => setConfirming(false)}>
          <div className="modal-card prompt-card" role="dialog" aria-modal="true" aria-labelledby="signout-title" onClick={(event) => event.stopPropagation()}>
            <p id="signout-title">Do you want to Sign-out?</p>
            <div className="computer-actions">
              <button className="ghost" type="button" onClick={() => setConfirming(false)} disabled={busy}>No</button>
              <button type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Yes"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
