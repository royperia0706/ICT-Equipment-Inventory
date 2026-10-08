"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function isApproval(item) {
  return /approval|edit request/i.test(item?.note || "");
}

export default function NeedApproval({ items = [] }) {
  const approvals = items.filter(isApproval);
  const summaries = items.filter((item) => item.summary && Number(item.count) > 0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button className="need-approval" type="button" onClick={() => setOpen(true)}>
        <span>Need Approval</span>
        <strong>{approvals.length}</strong>
      </button>
      {open ? (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal-card approval-card" role="dialog" aria-modal="true" aria-labelledby="need-approval-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2 id="need-approval-title">Need Approval {approvals.length}</h2>
              <button type="button" className="ghost" onClick={() => setOpen(false)}>Close</button>
            </div>
            {approvals.length === 0 ? (
              <p className="hint">No items need approval.</p>
            ) : (
              <ul className="approval-list">
                {approvals.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href}>{item.label}</Link>
                    <span>{item.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      {summaries.length ? (
        <ul className="status-attention">
          {summaries.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
