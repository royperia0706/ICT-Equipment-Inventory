"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OfficeStationFilters from "@/components/OfficeStationFilters";
import { acquireYears, conditionsByStatus, statuses } from "@/lib/computer-fields";
import { internetStatuses } from "@/lib/internet-fields";
import { officeLabel } from "@/lib/location-choices";

const kindApi = {
  Computer: { path: "/api/computers", key: "computer" },
  Printer: { path: "/api/printers", key: "printer" },
  Internet: { path: "/api/internets", key: "internet" },
  Display: { path: "/api/displays", key: "display" },
  Cellphone: { path: "/api/cellphones", key: "cellphone" },
  CCTV: { path: "/api/cctvs", key: "cctv" },
  Drone: { path: "/api/drones", key: "drone" },
  "Handheld Radio": { path: "/api/radios", key: "radio" },
  Storage: { path: "/api/storages", key: "storage" },
};

const inventoryKind = {
  "/inventory/computer": "Computer",
  "/inventory/printer": "Printer",
  "/inventory/internet": "Internet",
  "/inventory/router": "Router",
  "/inventory/switch": "Switch",
  "/inventory/display-projector": "Display",
  "/inventory/cellphone": "Cellphone",
  "/inventory/cctv": "CCTV",
  "/inventory/drone": "Drone",
  "/inventory/handheld-radio": "Handheld Radio",
  "/inventory/storage": "Storage",
};

function kindLabel(kind) {
  return kind === "Display" ? "Display/Projector" : (kind || "—");
}

function matchesFilters(record, filters) {
  if (filters.office) {
    const label = officeLabel(filters.office);
    const officeHit = record.office === filters.office || record.unit === filters.office || record.province === label;
    if (!officeHit) return false;
  }
  if (filters.station) {
    if (record.municipality !== filters.station.name) return false;
    const stationOffice = filters.station.unit;
    const sameOffice = record.office === stationOffice || record.unit === stationOffice || record.province === officeLabel(stationOffice);
    if (!sameOffice) return false;
  }
  if (filters.inventory && record.kind !== inventoryKind[filters.inventory]) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function statusChoices(kind) {
  return kind === "Internet" ? internetStatuses : statuses;
}

function statusProblem(form) {
  if (!form.status) return "Choose a status.";
  if (form.kind === "Internet") return "";
  const conditions = conditionsByStatus[form.status] || [];
  if (conditions.length && !conditions.includes(form.condition)) return "Choose a condition.";
  if (form.status === "Under Maintenance" && (!form.targetFixDate || !form.problemDetail.trim())) return "Fill in the required status fields.";
  if (form.status === "Unserviceable" && (!form.dateAssessed || !form.problemDetail.trim())) return "Fill in the required status fields.";
  if (form.status === "BER" && (!form.dateAssessed || !form.reasonForBer.trim())) return "Fill in the required status fields.";
  if (form.status === "Missing" && (!form.yearMissing || !form.remarks.trim())) return "Fill in the required status fields.";
  return "";
}

export default function EquipmentStatusList({ title, text, records = [], locations = [], user, pageStatuses = [] }) {
  const [rows, setRows] = useState(records);
  const [applied, setApplied] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const onFilter = useCallback((next) => setApplied(next), []);
  const visible = useMemo(() => {
    const source = applied ? rows.filter((row) => matchesFilters(row, applied)) : rows;
    return [...source].sort((a, b) => String(a.controlNumber || "").localeCompare(String(b.controlNumber || "")));
  }, [rows, applied]);

  useEffect(() => {
    if (!draft) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setDraft(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [draft]);

  function openStatus(row) {
    setError("");
    setDraft({
      ...row,
      status: row.status || "",
      condition: row.condition || "",
      targetFixDate: row.targetFixDate || "",
      problemDetail: row.problemDetail || "",
      dateAssessed: row.dateAssessed || "",
      reasonForBer: row.reasonForBer || "",
      yearMissing: row.yearMissing || "",
      remarks: row.remarks || "",
    });
  }

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft((current) => {
      const next = { ...current, [name]: value };
      if (name === "status") next.condition = "";
      return next;
    });
  }

  async function saveStatus(event) {
    event.preventDefault();
    const problem = statusProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const api = kindApi[draft.kind];
    if (!api) {
      setError("This inventory cannot be updated yet.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(api.path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: draft.id || draft.controlNumber, statusOnly: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not update the status.");
        return;
      }
      const saved = data[api.key];
      setNotice(data.message || "Status updated.");
      setRows((current) => {
        const gone = !saved || data.pending || (pageStatuses.length && !pageStatuses.includes(saved.status));
        if (gone) return current.filter((row) => row.id !== draft.id && row.controlNumber !== draft.controlNumber);
        return current.map((row) => (row.id === saved.id || row.controlNumber === saved.controlNumber ? saved : row));
      });
      setDraft(null);
    } catch {
      setError("Could not update the status.");
    } finally {
      setBusy(false);
    }
  }

  const choices = draft ? statusChoices(draft.kind) : [];
  const conditions = draft && draft.kind !== "Internet" ? (conditionsByStatus[draft.status] || []) : [];
  const years = acquireYears().map(String);

  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">{title}</p>
        <h1>{title}</h1>
      </header>
      <OfficeStationFilters locations={locations} user={user} onFilter={onFilter} />
      <section className="panel-card">
        <p className="hint">{text}</p>
        {notice ? <p className="hint">{notice}</p> : null}
        {error && !draft ? <p className="error" role="alert">{error}</p> : null}
        {visible.length === 0 ? (
          <p className="filter-empty">No equipment matches this list.</p>
        ) : (
          <div className="computer-table-wrap">
            <table className="computer-table filter-table">
              <thead>
                <tr>
                  <th>Control Number</th>
                  <th>Inventory</th>
                  <th>Office</th>
                  <th>Station</th>
                  <th>Brand</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.controlNumber || `${row.kind}-${row.serialNumber}`}>
                    <td>{row.controlNumber || "—"}</td>
                    <td>{kindLabel(row.kind)}</td>
                    <td>{row.province || "—"}</td>
                    <td>{row.municipality || "—"}</td>
                    <td>{row.brand || row.provider || "—"}</td>
                    <td>{row.serialNumber || "—"}</td>
                    <td>{row.status || "—"}</td>
                    <td>
                      <button className="row-btn" type="button" onClick={() => openStatus(row)}>Update Status</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {draft ? (
        <div className="modal-back" onClick={() => setDraft(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="update-status-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2 id="update-status-title">Update Status</h2>
              <button type="button" className="ghost" onClick={() => setDraft(null)}>Close</button>
            </div>
            <p className="hint">{kindLabel(draft.kind)} {draft.controlNumber}. Only Status can be changed.</p>
            <form className="form-grid" onSubmit={saveStatus}>
              <label>
                Status
                <select name="status" value={draft.status} onChange={updateDraft} required>
                  <option value="">--Select--</option>
                  {choices.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              {conditions.length ? (
                <label>
                  Condition
                  <select name="condition" value={draft.condition} onChange={updateDraft} required>
                    <option value="">--Select--</option>
                    {conditions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
              ) : null}
              {draft.status === "Under Maintenance" ? (
                <>
                  <label>
                    Target Date to be Fixed
                    <input name="targetFixDate" type="date" value={draft.targetFixDate} onChange={updateDraft} required />
                  </label>
                  <label>
                    Specify the problem or defect
                    <textarea name="problemDetail" rows={3} value={draft.problemDetail} onChange={updateDraft} required />
                  </label>
                </>
              ) : null}
              {draft.status === "Unserviceable" ? (
                <>
                  <label>
                    Date Assessed
                    <input name="dateAssessed" type="date" value={draft.dateAssessed} onChange={updateDraft} required />
                  </label>
                  <label>
                    Specify the problem or defect
                    <textarea name="problemDetail" rows={3} value={draft.problemDetail} onChange={updateDraft} required />
                  </label>
                </>
              ) : null}
              {draft.status === "BER" ? (
                <>
                  <label>
                    Date Assessed
                    <input name="dateAssessed" type="date" value={draft.dateAssessed} onChange={updateDraft} required />
                  </label>
                  <label>
                    Reason for BER
                    <textarea name="reasonForBer" rows={3} value={draft.reasonForBer} onChange={updateDraft} required />
                  </label>
                </>
              ) : null}
              {draft.status === "Missing" ? (
                <>
                  <label>
                    Year discovered missing
                    <select name="yearMissing" value={draft.yearMissing} onChange={updateDraft} required>
                      <option value="">--Select--</option>
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                  <label>
                    Remarks
                    <textarea name="remarks" rows={3} value={draft.remarks} onChange={updateDraft} required />
                  </label>
                </>
              ) : null}
              {error ? <p className="error span-row" role="alert">{error}</p> : null}
              <div className="computer-actions span-row">
                <button type="submit" disabled={busy}>{busy ? "Please wait…" : "Save status"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
