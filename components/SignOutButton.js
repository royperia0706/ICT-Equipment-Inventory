"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "ghost", children = "Sign out" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button className={className} type="button" onClick={signOut} disabled={busy}>
      {busy ? "Signing out…" : children}
    </button>
  );
}
