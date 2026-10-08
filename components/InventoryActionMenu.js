"use client";

import { useEffect, useRef, useState } from "react";
import { decisionText } from "@/components/PendingActions";
import { canDecideChanges, canDecideEditRequest } from "@/lib/approval-access";

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm9 2.7-.9-.2a7.2 7.2 0 0 0-.6-1.5l.6-.7a1 1 0 0 0-.1-1.4l-1.1-1.1a1 1 0 0 0-1.4-.1l-.7.6a7.2 7.2 0 0 0-1.5-.6L15.1 4a1 1 0 0 0-1-1h-1.6a1 1 0 0 0-1 .8l-.2.9a7.2 7.2 0 0 0-1.5.6l-.7-.6a1 1 0 0 0-1.4.1L6.6 6.9a1 1 0 0 0-.1 1.4l.6.7a7.2 7.2 0 0 0-.6 1.5l-.9.2a1 1 0 0 0-.8 1v1.6a1 1 0 0 0 .8 1l.9.2c.1.5.3 1 .6 1.5l-.6.7a1 1 0 0 0 .1 1.4l1.1 1.1a1 1 0 0 0 1.4.1l.7-.6c.5.3 1 .5 1.5.6l.2.9a1 1 0 0 0 1 .8h1.6a1 1 0 0 0 1-.8l.2-.9c.5-.1 1-.3 1.5-.6l.7.6a1 1 0 0 0 1.4-.1l1.1-1.1a1 1 0 0 0 .1-1.4l-.6-.7c.3-.5.5-1 .6-1.5l.9-.2a1 1 0 0 0 .8-1v-1.6a1 1 0 0 0-.8-1Z" />
    </svg>
  );
}

function MenuIcon({ name }) {
  const paths = {
    edit: "M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 1.1-1.1Z",
    delete: "M7 20a2 2 0 0 1-2-2V7h14v11a2 2 0 0 1-2 2H7Zm1-10v7h2v-7H8Zm6 0v7h2v-7h-2ZM9 4h6l1 1h4v2H4V5h4l1-1Z",
    view: "M12 6c-5 0-8.5 4.2-9.5 6 1 1.8 4.5 6 9.5 6s8.5-4.2 9.5-6c-1-1.8-4.5-6-9.5-6Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
    approve: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
    reject: "M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z",
    cancel: "M6.3 4.9 4.9 6.3 10.6 12l-5.7 5.7 1.4 1.4 5.7-5.7 5.7 5.7 1.4-1.4-5.7-5.7 5.7-5.7-1.4-1.4-5.7 5.7-5.7-5.7Z",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={paths[name]} />
    </svg>
  );
}

function ResultPrompt({ message, onClose }) {
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

export default function InventoryActionMenu({
  user,
  row,
  busy,
  onEdit,
  onDelete,
  onView,
  onDecide,
  cancelApi,
  recordKey,
  onCancelDone,
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const [working, setWorking] = useState(false);
  const [prompt, setPrompt] = useState("");
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const editRequest = canDecideEditRequest(user, row);
  const changes = canDecideChanges(user, row);
  const canCancel = user?.role === "encoder" && row?.editRequest === "pending";

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const rect = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setPlace({
      right: Math.max(8, window.innerWidth - rect.right),
      top: below < 260 ? rect.top - 8 : rect.bottom + 6,
      upward: below < 260,
    });
    setOpen((current) => !current);
  }

  async function decide(decision, target) {
    setOpen(false);
    setWorking(true);
    try {
      const ok = await onDecide(row, decision, target);
      if (ok) {
        const deleted = decision === "approve" && row.pendingAction === "delete";
        setPrompt(deleted
          ? `${row.controlNumber || "Item"} was successfully deleted.`
          : decisionText(row, decision, target));
      }
    } finally {
      setWorking(false);
    }
  }

  async function deleteItem() {
    setOpen(false);
    setWorking(true);
    try {
      const deleted = await onDelete(row);
      if (deleted) setPrompt(`${row.controlNumber || "Item"} was successfully deleted.`);
    } finally {
      setWorking(false);
    }
  }

  async function cancelEdit() {
    setOpen(false);
    setWorking(true);
    try {
      const response = await fetch(cancelApi, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, cancelEditRequest: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onCancelDone?.({ error: data.error || "Could not cancel the edit request." });
        return;
      }
      onCancelDone?.({ record: data[recordKey], message: data.message || "Edit request cancelled." });
    } catch {
      onCancelDone?.({ error: "Could not cancel the edit request." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="account-action">
      <button ref={buttonRef} className="action-btn" type="button" onClick={toggle} disabled={busy || working}>
        <GearIcon />
        Action
        <span className="action-caret" aria-hidden="true" />
      </button>
      {open && place ? (
        <div
          ref={menuRef}
          className="action-menu"
          style={{
            right: place.right,
            top: place.upward ? "auto" : place.top,
            bottom: place.upward ? window.innerHeight - place.top : "auto",
          }}
        >
          <button type="button" onClick={() => { setOpen(false); onEdit(row); }}><MenuIcon name="edit" />Edit</button>
          {user?.role === "encoder" ? null : (
            <button type="button" onClick={deleteItem}><MenuIcon name="delete" />Delete</button>
          )}
          {onView ? <button type="button" onClick={() => { setOpen(false); onView(row); }}><MenuIcon name="view" />View</button> : null}
          {canCancel ? <button type="button" onClick={cancelEdit}><MenuIcon name="cancel" />Cancel Edit Request</button> : null}
          {editRequest ? (
            <>
              <button type="button" onClick={() => decide("approve", "edit-request")}><MenuIcon name="approve" />Accept edit</button>
              <button type="button" onClick={() => decide("reject", "edit-request")}><MenuIcon name="reject" />Reject edit</button>
            </>
          ) : null}
          {changes ? (
            <>
              <button type="button" onClick={() => decide("approve", "changes")}><MenuIcon name="approve" />Approve</button>
              <button type="button" onClick={() => decide("reject", "changes")}><MenuIcon name="reject" />Reject</button>
            </>
          ) : null}
        </div>
      ) : null}
      <ResultPrompt message={prompt} onClose={() => setPrompt("")} />
    </div>
  );
}
