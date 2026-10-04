"use client";

import { useEffect, useMemo, useState } from "react";
import { agingLabel, columnsWithAging } from "@/lib/aging";
import { acquireYears, conditionsByStatus, statuses } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";
import {
  colorCapabilities,
  connectionTypes,
  printerAcquisitions,
  printerColumns,
} from "@/lib/printer-fields";

const emptyForm = {
  printerType: "",
  brand: "",
  model: "",
  yearModel: "",
  serialNumber: "",
  connectionType: "",
  tonerInkType: "",
  colorCapability: "",
  province: "",
  municipality: "",
  office: "",
  section: "",
  accountablePerson: "",
  assignedUser: "",
  status: "",
  condition: "",
  targetFixDate: "",
  problemDetail: "",
  dateAssessed: "",
  reasonForBer: "",
  yearMissing: "",
  modeOfAcquisition: "",
  dateAcquired: "",
  acquisitionCost: "",
  remarks: "",
};

function yearOptions(current) {
  const years = acquireYears();
  const saved = String(current || "");
  if (saved && !years.includes(saved)) return [saved, ...years];
  return years;
}

function formFromRow(row) {
  const status = statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : "";
  return {
    ...emptyForm,
    printerType: row.printerType || "",
    brand: row.brand || "",
    model: row.model || "",
    yearModel: String(row.yearModel || "").slice(0, 4),
    serialNumber: row.serialNumber || "",
    connectionType: row.connectionType || "",
    tonerInkType: row.tonerInkType || "",
    colorCapability: row.colorCapability || "",
    province: row.province || "",
    municipality: row.municipality || "",
    office: row.office || "",
    section: row.section || "",
    accountablePerson: row.accountablePerson || "",
    assignedUser: row.assignedUser || "",
    status,
    condition: (conditionsByStatus[status] || []).includes(row.condition) ? row.condition : "",
    targetFixDate: row.targetFixDate || "",
    problemDetail: row.problemDetail || "",
    dateAssessed: row.dateAssessed || "",
    reasonForBer: row.reasonForBer || "",
    yearMissing: row.yearMissing || "",
    modeOfAcquisition: row.modeOfAcquisition || "",
    dateAcquired: String(row.dateAcquired || "").slice(0, 4),
    acquisitionCost: row.acquisitionCost || "",
    remarks: row.remarks || "",
  };
}

function Field({ label, required, wide, children }) {
  return (
    <label className={wide ? "span-row" : undefined}>
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function Select({ name, value, onChange, options, disabled, required, blank = true, autoComplete = "off" }) {
  return (
    <select name={name} value={value || ""} onChange={onChange} disabled={disabled} required={required} autoComplete={autoComplete}>
      {blank ? <option value="">--Select--</option> : null}
      {options.filter(Boolean).map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  );
}

export default function PrinterInventory({ initial = [], locations = [], user = null }) {
  const [rows, setRows] = useState(initial);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [basicRequest, setBasicRequest] = useState(false);

  const provinceOptions = useMemo(() => {
    const region = regionsIn(locations)[0];
    return officesIn(locations, region).map((unit) => officeLabel(unit));
  }, [locations]);

  const stationOptions = useMemo(() => {
    const unit = officesIn(locations, regionsIn(locations)[0]).find((item) => officeLabel(item) === form.province);
    return stationsIn(locations, unit);
  }, [locations, form.province]);

  useEffect(() => {
    if (mode !== "add" || editingId || !locations.length) return;
    const region = regionsIn(locations)[0];
    const unit = officesIn(locations, region)[0] || "";
    const stations = stationsIn(locations, unit);
    const province = officeLabel(unit);
    const municipality = stations.length === 1 ? stations[0].name : "";
    setForm((current) => {
      if (current.province === province && current.office === unit && current.municipality === municipality) return current;
      return { ...current, province, office: unit, municipality };
    });
  }, [mode, editingId, locations]);

  useEffect(() => {
    if (mode !== "add") return;
    const params = new URLSearchParams({
      preview: "1",
      municipality: form.municipality,
      office: form.office,
    });
    fetch(`/api/printers?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.controlNumber) setControlNumber(data.controlNumber);
      })
      .catch(() => {});
  }, [mode, form.municipality, form.office]);

  const columns = useMemo(() => columnsWithAging(printerColumns), []);

  function canDecide(row) {
    if (!user || !row?.pendingAction) return false;
    if (user.role === "super-admin") return true;
    if (row.pendingAction === "ber") return false;
    return user.role === "assistant-admin";
  }

  function needsApproval() {
    const ber = /^(for\s*ber|ber)$/i.test(form.status) || /^(for\s*ber|ber)$/i.test(form.condition);
    if (ber && user?.role !== "super-admin") return true;
    return Boolean(editingId) && user?.role === "encoder";
  }

  function update(event) {
    const { name, value } = event.target;
    if (name === "status" || name === "printerStatus") {
      setForm((current) => ({ ...current, status: value, condition: "" }));
      return;
    }
    if (name === "province") {
      const unit = officesIn(locations, regionsIn(locations)[0]).find((item) => officeLabel(item) === value);
      const stations = stationsIn(locations, unit);
      setForm((current) => ({
        ...current,
        province: value,
        office: unit || "",
        municipality: stations[0]?.name || "",
      }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function cancel() {
    setForm(emptyForm);
    setEditingId("");
    setBasicRequest(false);
    setError("");
    setMode("list");
  }

  function editRow(row) {
    setForm(formFromRow(row));
    setEditingId(row.id);
    setBasicRequest(false);
    setControlNumber(row.controlNumber || "");
    setError("");
    setMode("edit");
  }

  async function removeRow(row) {
    if (!window.confirm(`Delete ${row.controlNumber}?`)) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/printers?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this printer.");
      return;
    }
    if (data.pending && data.printer) {
      setRows((current) => current.map((item) => (item.id === data.printer.id ? data.printer : item)));
      setNotice(data.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  async function decide(row, decision) {
    setError("");
    setNotice("");
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipment: "printer", id: row.id, decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this request.");
      return;
    }
    if (data.removed || (decision === "approve" && row.pendingAction === "delete")) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (data.record) setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/printers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.printer) {
        setError(data.error || "Could not save this printer.");
        return;
      }
      setRows((current) => [data.printer, ...current.filter((row) => row.id !== data.printer.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this printer.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit printer" : mode === "add" ? "Add printer" : "Printer";

  return (
    <div className="dash computer-page">
      <header className="dash-head computer-head">
        <div>
          <p className="kicker">Inventory</p>
          <h1>{title}</h1>
        </div>
        {mode === "list" ? (
          <button className="add-btn" type="button" onClick={() => { setEditingId(""); setBasicRequest(false); setForm(emptyForm); setMode("add"); }}>Add</button>
        ) : null}
      </header>

      {mode === "list" ? (
        <section className="panel-card">
          {error ? <p className="error" role="alert">{error}</p> : null}
          {notice ? <p className="hint">{notice}</p> : null}
          {rows.length === 0 ? (
            <p className="hint">No printers encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {columns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th className="freeze end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.controlNumber}>
                      {columns.map(([key]) => (
                        <td key={key}>
                          {key === "aging"
                            ? agingLabel(row.dateAcquired)
                            : key === "status" && row.status === "Pending" && row.pendingStatus
                              ? `Pending · ${row.pendingStatus}`
                              : row[key] || "—"}
                        </td>
                      ))}
                      <td className="freeze end">
                        <div className="row-actions">
                          <button className="row-btn" type="button" onClick={() => editRow(row)}>Edit</button>
                          {user?.role === "encoder" ? null : (
                            <button className="row-btn danger" type="button" onClick={() => removeRow(row)}>Delete</button>
                          )}
                          {canDecide(row) ? (
                            <>
                              <button className="row-btn" type="button" onClick={() => decide(row, "approve")}>Approve</button>
                              <button className="row-btn danger" type="button" onClick={() => decide(row, "reject")}>Reject</button>
                            </>
                          ) : null}
                        </div>
                        {row.pendingAction === "edit" ? <p className="pending-note">Edit awaiting approval</p> : null}
                        {row.pendingAction === "delete" ? <p className="pending-note">Delete awaiting approval</p> : null}
                        {row.pendingAction === "ber" ? <p className="pending-note">For BER awaiting Super Admin</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <form key={editingId || "new-printer"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
          <section className="panel-card">
            <div className="section-head">
              <h2>Basic information</h2>
              {editingId && user?.role === "encoder" ? (
                <button className="ghost" type="button" disabled={basicRequest} onClick={() => setBasicRequest(true)}>
                  {basicRequest ? "Edit requested" : "Request for edit"}
                </button>
              ) : null}
            </div>
            {editingId && user?.role === "encoder" ? (
              <p className="hint">{basicRequest ? "This change stays pending until an Assistant Admin or Super Admin approves it." : "Basic information is locked so the saved record is not overwritten."}</p>
            ) : null}
            <fieldset className="form-grid" disabled={Boolean(editingId) && user?.role === "encoder" && !basicRequest}>
              <Field label="Control Number" required>
                <input value={controlNumber} disabled />
              </Field>
              <Field label="Region" required>
                <input value={regionsIn(locations)[0] || "PRO 4A - CALABARZON"} disabled />
              </Field>
              <Field label="Office" required>
                <Select name="province" value={form.province} onChange={update} disabled blank={false} options={provinceOptions.length ? provinceOptions : [form.province]} />
              </Field>
              <Field label="Station" required>
                <Select
                  name="municipality"
                  value={form.municipality}
                  onChange={update}
                  required
                  blank={stationOptions.length !== 1}
                  disabled={stationOptions.length <= 1}
                  options={stationOptions.map((row) => ({ value: row.name, label: `${row.name} (${row.classification})` }))}
                />
              </Field>
              <Field label="Printer Type" required>
                <input name="printerType" value={form.printerType} onChange={update} required placeholder="Ilagay ang uri ng printer" />
              </Field>
              <Field label="Brand" required>
                <input name="brand" value={form.brand} onChange={update} required placeholder="Hal. HP, Canon, Epson" />
              </Field>
              <Field label="Model" required>
                <input name="model" value={form.model} onChange={update} required placeholder="Hal. LaserJet Pro M428fdw" />
              </Field>
              <Field label="Year Model" required>
                <Select name="yearModel" value={form.yearModel} onChange={update} options={yearOptions(form.yearModel)} required />
              </Field>
              <Field label="Serial Number" required>
                <input name="serialNumber" value={form.serialNumber} onChange={update} required />
              </Field>
              <Field label="Connection Type" required>
                <Select name="connectionType" value={form.connectionType} onChange={update} options={connectionTypes} required />
              </Field>
            </fieldset>
          </section>

          <section className="panel-card">
            <h2>Supply and print details</h2>
            <div className="form-grid">
              <Field label="Toner / Ink Type" required>
                <input name="tonerInkType" value={form.tonerInkType} onChange={update} required placeholder="Hal. CF226A / 051" />
              </Field>
              <Field label="Color Capability" required>
                <Select name="colorCapability" value={form.colorCapability} onChange={update} options={colorCapabilities} required />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>User and Accountability</h2>
            <div className="form-grid">
              <Field label="Section" required>
                <input name="section" value={form.section} onChange={update} required />
              </Field>
              <Field label="Specific User" required>
                <input name="accountablePerson" value={form.accountablePerson} onChange={update} required placeholder="Pangalan ng specific user" />
              </Field>
              <Field label="Assigned User" required>
                <input name="assignedUser" value={form.assignedUser} onChange={update} required placeholder="Pangalan ng gumagamit" />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Status and condition</h2>
            <div className="form-grid">
              <Field label="Printer Status" required>
                <Select name="printerStatus" value={form.status} onChange={update} options={statuses} required />
              </Field>
              {form.status && (conditionsByStatus[form.status] || []).length ? (
                <Field label="Condition" required>
                  <Select name="condition" value={form.condition} onChange={update} options={conditionsByStatus[form.status]} required />
                </Field>
              ) : null}
              {form.status === "Unserviceable" ? (
                <>
                  <Field label="Date Assessed" required>
                    <input name="dateAssessed" type="date" value={form.dateAssessed} onChange={update} required />
                  </Field>
                  <Field label="Specify the printer's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Under Maintenance" ? (
                <>
                  <Field label="Target Date to be Fixed" required>
                    <input name="targetFixDate" type="date" value={form.targetFixDate} onChange={update} required />
                  </Field>
                  <Field label="Specify the printer's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "BER" ? (
                <>
                  <Field label="Date Assessed" required>
                    <input name="dateAssessed" type="date" value={form.dateAssessed} onChange={update} required />
                  </Field>
                  <Field label="Reason for BER" wide required>
                    <textarea name="reasonForBer" rows={3} value={form.reasonForBer} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Missing" ? (
                <>
                  <Field label="Year discovered missing" required>
                    <Select name="yearMissing" value={form.yearMissing} onChange={update} options={yearOptions(form.yearMissing)} required />
                  </Field>
                  <Field label="Remarks" wide required>
                    <textarea name="remarks" rows={3} value={form.remarks} onChange={update} required />
                  </Field>
                </>
              ) : null}
            </div>
          </section>

          <section className="panel-card">
            <h2>Acquisition</h2>
            <div className="form-grid">
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={form.modeOfAcquisition && !printerAcquisitions.includes(form.modeOfAcquisition) ? [form.modeOfAcquisition, ...printerAcquisitions] : printerAcquisitions} required />
              </Field>
              <Field label="Year Acquired" required>
                <Select name="dateAcquired" value={form.dateAcquired} onChange={update} options={yearOptions(form.dateAcquired)} required />
              </Field>
              <Field label="Acquisition Cost">
                <input
                  name="acquisitionCost"
                  value={form.acquisitionCost}
                  onChange={update}
                  onFocus={(event) => {
                    if (!event.target.value.startsWith("₱")) {
                      setForm((current) => ({ ...current, acquisitionCost: `₱${current.acquisitionCost}` }));
                    }
                  }}
                  placeholder="₱"
                />
              </Field>
            </div>
          </section>

          {form.status === "Missing" ? null : (
          <section className="panel-card">
            <h2>Remarks</h2>
            <Field label="Remarks">
              <textarea name="remarks" rows={3} value={form.remarks} onChange={update} placeholder="Mga isyu, kasaysayan ng pagkukumpuni, atbp." />
            </Field>
          </section>
          )}

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update printer" : "Save printer"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
