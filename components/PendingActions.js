"use client";

import ChangeNotes from "@/components/ChangeNotes";
import { approverLabel, canDecideChanges, canDecideEditRequest } from "@/lib/approval-access";

export function PendingButtons({ user, row, onDecide }) {
  return (
    <>
      {canDecideEditRequest(user, row) ? (
        <>
          <button className="row-btn" type="button" onClick={() => onDecide(row, "approve", "edit-request")}>Accept edit</button>
          <button className="row-btn danger" type="button" onClick={() => onDecide(row, "reject", "edit-request")}>Reject edit</button>
        </>
      ) : null}
      {canDecideChanges(user, row) ? (
        <>
          <button className="row-btn" type="button" onClick={() => onDecide(row, "approve", "changes")}>Approve</button>
          <button className="row-btn danger" type="button" onClick={() => onDecide(row, "reject", "changes")}>Reject</button>
        </>
      ) : null}
    </>
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
