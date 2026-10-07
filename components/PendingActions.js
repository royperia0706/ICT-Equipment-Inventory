"use client";

import { useState } from "react";
import ChangeNotes from "@/components/ChangeNotes";
import { approverLabel, canDecideChanges, canDecideEditRequest } from "@/lib/approval-access";

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

function DecisionPrompt({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="modal-back prompt-back" role="presentation">
      <div className="modal-card prompt-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <p>{message}</p>
        <button type="button" onClick={onClose}>Ok</button>
      </div>
    </div>
  );
}

export function PendingButtons({ user, row, onDecide }) {
  const [prompt, setPrompt] = useState("");

  async function run(decision, target) {
    const ok = await onDecide(row, decision, target);
    if (ok) setPrompt(decisionText(row, decision, target));
  }

  return (
    <>
      {canDecideEditRequest(user, row) ? (
        <>
          <button className="row-btn" type="button" onClick={() => run("approve", "edit-request")}>Accept edit</button>
          <button className="row-btn danger" type="button" onClick={() => run("reject", "edit-request")}>Reject edit</button>
        </>
      ) : null}
      {canDecideChanges(user, row) ? (
        <>
          <button className="row-btn" type="button" onClick={() => run("approve", "changes")}>Approve</button>
          <button className="row-btn danger" type="button" onClick={() => run("reject", "changes")}>Reject</button>
        </>
      ) : null}
      <DecisionPrompt message={prompt} onClose={() => setPrompt("")} />
    </>
  );
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
