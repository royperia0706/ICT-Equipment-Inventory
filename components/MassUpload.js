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
  const [prompt, setPrompt] = useState("");
  if (user?.role !== "super-admin" || !spec) return null;

  function closeModal() {
    if (busy) return;
    setOpen(false);
    setPrompt("");
  }

  async function sendFile(mode) {
    const body = new FormData();
    body.set("kind", kind);
    body.set("mode", mode);
    body.set("file", file);
    const response = await fetch("/api/import", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose an Excel file.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    setPrompt("");
    try {
      const { response, data } = await sendFile("check");
      if (data.mismatch) {
        setPrompt("mismatch");
        return;
      }
      if (!response.ok) {
        setError(data.error || "Could not read the file.");
        return;
      }
      setPrompt("confirm");
    } catch {
      setError("Could not read the file.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpload() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { response, data } = await sendFile("save");
      if (data.mismatch || !response.ok) {
        setPrompt("mismatch");
        return;
      }
      setPrompt("");
      setMessage(`Uploaded ${data.added}.`);
      const listed = await fetch(spec.reload).then((result) => result.json());
      if (Array.isArray(listed[spec.listKey])) onLoaded(listed[spec.listKey]);
      setFile(null);
    } catch {
      setPrompt("mismatch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="ghost" type="button" onClick={() => { setOpen(true); setError(""); setMessage(""); setPrompt(""); }}>Mass upload</button>
      {open ? (
        <div className="modal-back" role="presentation" onClick={closeModal}>
          <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={upload}>
            <div className="modal-head">
              <h2>Mass upload</h2>
              <button className="ghost" type="button" onClick={closeModal} disabled={busy}>Close</button>
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
            <button type="submit" disabled={busy}>{busy ? "Reading…" : "Upload"}</button>
          </form>
          {prompt ? (
            <div className="modal-back prompt-back" role="presentation" onClick={(event) => event.stopPropagation()}>
              <div className="modal-card prompt-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                {prompt === "confirm" ? (
                  <>
                    <p>Do you want to upload data?</p>
                    <div className="filter-actions">
                      <button type="button" onClick={saveUpload} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
                      <button className="ghost" type="button" onClick={() => setPrompt("")} disabled={busy}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Database did not match. Update your data and try again</p>
                    <button type="button" onClick={() => setPrompt("")}>Ok</button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
