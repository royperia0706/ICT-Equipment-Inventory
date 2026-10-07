"use client";

import { useState } from "react";
import ChangeNotes from "@/components/ChangeNotes";
import { approverLabel } from "@/lib/approval-access";

function kindName(row) {
  return row?.kind || "equipment";
}

export function decisionText(row, decision, target) {
  const verb = decision === "reject" ? "reject" : "approve";
  const station = row?.municipality || row?.province || "the station";
  const kind = kindName(row);
  let action = `edit ${kind}`;
  if (target === "edit-request") action = `edit ${kind}`;
  else if (row?.pendingAction === "delete") action = `delete ${kind}`;
  else if (row?.pendingAction === "ber" || row?.pendingStatus || row?.pendingPayload?.status) action = `edit ${kind} status`;
  return `You ${verb} the request of ${station} on ${action}`;
}

export function CancelEditButton({ user, row, api, recordKey, onDone, variant = "row" }) {
  const [busy, setBusy] = useState(false);
  if (user?.role !== "encoder" || row?.editRequest !== "pending") return null;

  async function cancel() {
    setBusy(true);
    try {
      const response = await fetch(api, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, cancelEditRequest: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onDone?.({ error: data.error || "Could not cancel the edit request." });
        return;
      }
      onDone?.({ record: data[recordKey], message: data.message || "Edit request cancelled." });
    } catch {
      onDone?.({ error: "Could not cancel the edit request." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={variant === "ghost" ? "ghost" : "row-btn"} type="button" disabled={busy} onClick={cancel}>
      {busy ? "Cancelling…" : "Cancel Edit Request"}
    </button>
  );
}

export function PendingNotes({ row }) {
  const approver = approverLabel(row);
  return (
    <>
      {row.editRequest === "pending" ? <p className="pending-note">Edit request awaiting Super Admin</p> : null}
      {row.pendingAction === "edit" ? <p className="pending-note">Changes awaiting {approver}</p> : null}
      <ChangeNotes record={row} />
      {row.pendingAction === "delete" ? <p className="pending-note">Delete awaiting approval</p> : null}
      {row.pendingAction === "ber" ? <p className="pending-note">For BER awaiting {approver}</p> : null}
    </>
  );
}
