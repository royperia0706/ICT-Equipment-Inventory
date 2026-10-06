"use client";

import { useState } from "react";
import { importKinds, templateColumns } from "@/lib/import-columns";

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadTemplate(kind) {
  const spec = importKinds[kind];
  const columns = templateColumns(kind);
  const header = `<Row>${columns.map(([, label]) => `<Cell><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("")}</Row>`;
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xmlEscape(spec.title)}"><Table>${header}</Table></Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${spec.title.toLowerCase().replace(/\s+/g, "-")}-upload.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function MassUpload({ kind, user, onLoaded }) {
  const spec = importKinds[kind];
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (user?.role !== "super-admin" || !spec) return null;

  async function upload(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose an Excel file.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/import", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not upload the file.");
        return;
      }
      const failed = data.errors?.length || 0;
      setMessage(failed
        ? `Uploaded ${data.added}. ${failed} ${failed === 1 ? "row" : "rows"} failed.`
        : `Uploaded ${data.added}.`);
      if (failed) setError(data.errors.slice(0, 8).map((item) => `Row ${item.row}: ${item.error}`).join(" "));
      const listed = await fetch(spec.reload).then((result) => result.json());
      if (Array.isArray(listed[spec.listKey])) onLoaded(listed[spec.listKey]);
      setFile(null);
    } catch {
      setError("Could not upload the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="ghost" type="button" onClick={() => { setOpen(true); setError(""); setMessage(""); }}>Mass upload</button>
      {open ? (
        <div className="modal-back" role="presentation" onClick={() => { if (!busy) setOpen(false); }}>
          <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={upload}>
            <div className="modal-head">
              <h2>Mass upload</h2>
              <button className="ghost" type="button" onClick={() => setOpen(false)} disabled={busy}>Close</button>
            </div>
            <p className="hint">Upload an Excel file for {spec.title}. The system assigns the control number and entry date. Use up to 150 rows.</p>
            <button className="ghost" type="button" onClick={() => downloadTemplate(kind)}>Download template</button>
            <label>
              Excel file
              <input
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            {message ? <p className="hint">{message}</p> : null}
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
