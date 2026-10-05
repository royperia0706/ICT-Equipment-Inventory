"use client";

import FocusableRow from "@/components/FocusableRow";
import { PendingButtons, PendingNotes } from "@/components/PendingActions";
import { useEffect, useMemo, useState } from "react";
import { cellphoneAcquisitions, cellphoneColumns, cellphoneTypes } from "@/lib/cellphone-fields";
import { acquireYears, conditionsByStatus, statuses } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const emptyForm = {
  cellphoneType: "",
  brand: "",
  operatingSystem: "",
  serialNumber: "",
  simNumber: "",
  mobileNetwork: "",
  storageCapacity: "",
  ram: "",
  yearModel: "",
  acquisitionCost: "",
  modeOfAcquisition: "",
  issuedTo: "",
  status: "",
  condition: "",
  targetFixDate: "",
  problemDetail: "",
  dateAssessed: "",
  reasonForBer: "",
  yearMissing: "",
  remarks: "",
  region: "",
  province: "",
  municipality: "",
  office: "",
};

function yearOptions(current, startYear) {
  const years = acquireYears(new Date(), startYear);
  const saved = String(current || "");
  if (saved && !years.includes(saved)) return [saved, ...years];
  return years;
}

function formFromRow(row) {
  const status = statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : "";
  return {
    ...emptyForm,
    cellphoneType: cellphoneTypes.includes(row.cellphoneType) ? row.cellphoneType : "",
    brand: row.brand || "",
    operatingSystem: row.operatingSystem || "",
    serialNumber: row.serialNumber || "",
    simNumber: row.simNumber || "",
    mobileNetwork: row.mobileNetwork || "",
    storageCapacity: row.storageCapacity || "",
    ram: row.ram || "",
    yearModel: String(row.yearModel || "").slice(0, 4),
    acquisitionCost: row.acquisitionCost || "",
    modeOfAcquisition: cellphoneAcquisitions.includes(row.modeOfAcquisition) ? row.modeOfAcquisition : "",
    issuedTo: row.issuedTo || "",
    status,
    condition: (conditionsByStatus[status] || []).includes(row.condition) ? row.condition : "",
    targetFixDate: row.targetFixDate || "",
    problemDetail: row.problemDetail || "",
    dateAssessed: row.dateAssessed || "",
    reasonForBer: row.reasonForBer || "",
    yearMissing: row.yearMissing || "",
    remarks: row.remarks || "",
    region: row.region || "",
    province: row.province || "",
    municipality: row.municipality || "",
    office: row.office || "",
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

export default function CellphoneInventory({ initial = [], locations = [], user = null }) {
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
      if (current.province === province && current.office === unit && current.municipality === municipality && current.region === region) return current;
      return { ...current, region, province, office: unit, municipality };
    });
  }, [mode, editingId, locations]);

  useEffect(() => {
    if (mode !== "add") return;
    const params = new URLSearchParams({
      preview: "1",
      municipality: form.municipality,
      office: form.office,
    });
    fetch(`/api/cellphones?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.controlNumber) setControlNumber(data.controlNumber);
      })
      .catch(() => {});
  }, [mode, form.municipality, form.office]);

  function needsApproval() {
    const ber = /^(for\s*ber|ber)$/i.test(form.status) || /^(for\s*ber|ber)$/i.test(form.condition);
    if (ber && user?.role !== "super-admin") return true;
    return Boolean(editingId) && user?.role !== "super-admin";
  }

  function update(event) {
    const { name, value } = event.target;
    if (name === "status" || name === "cellphoneStatus") {
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
    const response = await fetch(`/api/cellphones?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this cellphone.");
      return;
    }
    if (data.pending && data.cellphone) {
      setRows((current) => current.map((item) => (item.id === data.cellphone.id ? data.cellphone : item)));
      setNotice(data.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  async function decide(row, decision, target) {
    setError("");
    setNotice("");
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipment: "cellphone", id: row.id, decision, target }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this request.");
      return;
    }
    setNotice(decision === "approve" ? "Approved." : "Rejected.");
    if (data.removed || (decision === "approve" && row.pendingAction === "delete")) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (data.record) setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
  }

  async function requestEdit() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/cellphones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, requestEditAccess: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.cellphone) {
        setError(data.error || "Could not request edit access.");
        return;
      }
      setRows((current) => current.map((item) => (item.id === data.cellphone.id ? data.cellphone : item)));
      setNotice(data.message || "");
    } catch {
      setError("Could not request edit access.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/cellphones", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.cellphone) {
        setError(data.error || "Could not save this cellphone.");
        return;
      }
      setRows((current) => [data.cellphone, ...current.filter((row) => row.id !== data.cellphone.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this cellphone.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit cellphone" : mode === "add" ? "Add cellphone" : "Cellphone";
  const editingRow = rows.find((row) => row.id === editingId) || null;
  const fieldsLocked = Boolean(editingId) && user?.role !== "super-admin" && !editingRow?.editGranted;
  const regionName = form.region || regionsIn(locations)[0] || "PRO 4A - CALABARZON";

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
            <p className="hint">No cellphones encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {cellphoneColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <FocusableRow key={row.id || row.controlNumber} focusKey={row.controlNumber || row.id}>
                      {cellphoneColumns.map(([key]) => (
                        <td key={key}>
                          {key === "status" && row.status === "Pending" && row.pendingStatus
                            ? `Pending · ${row.pendingStatus}`
                            : row[key] || "—"}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          <button className="row-btn" type="button" onClick={() => editRow(row)}>Edit</button>
                          {user?.role === "encoder" ? null : (
                            <button className="row-btn danger" type="button" onClick={() => removeRow(row)}>Delete</button>
                          )}
                          <PendingButtons user={user} row={row} onDecide={decide} />
                        </div>
                        <PendingNotes row={row} />
                      </td>
                    </FocusableRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <form key={editingId || "new-cellphone"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
          <section className="panel-card">
            <div className="section-head">
              <h2>Basic information</h2>
              {editingId && user?.role !== "super-admin" && !editingRow?.editGranted ? (
                <button className="ghost" type="button" disabled={editingRow?.editRequest === "pending" || busy} onClick={requestEdit}>
                  {editingRow?.editRequest === "pending" ? "Edit requested" : "Request Edit"}
                </button>
              ) : null}
            </div>
            {editingId && user?.role !== "super-admin" ? (
              <p className="hint">{editingRow?.editGranted ? "Other fields are open. Saving still waits for Super Admin approval." : editingRow?.editRequest === "pending" ? "Edit request is waiting for a Super Admin. Only Status can be changed until it is accepted." : "Only Status can be changed. Request Edit and wait for a Super Admin before changing other fields."}</p>
            ) : null}
            <fieldset className="form-grid" disabled={fieldsLocked}>
              <Field label="Control Number" required>
                <input value={controlNumber} disabled />
              </Field>
              <Field label="Region" required>
                <input value={regionName} disabled />
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
              <Field label="Cellphone Type" required>
                <Select name="cellphoneType" value={form.cellphoneType} onChange={update} options={cellphoneTypes} required />
              </Field>
              <Field label="Brand" required>
                <input name="brand" value={form.brand} onChange={update} required />
              </Field>
              <Field label="Operating System" required>
                <input name="operatingSystem" value={form.operatingSystem} onChange={update} required placeholder="e.g. Android 14, iOS 18" />
              </Field>
              <Field label="Serial Number" required>
                <input name="serialNumber" value={form.serialNumber} onChange={update} required />
              </Field>
              <Field label="SIM Number" required>
                <input name="simNumber" value={form.simNumber} onChange={update} required />
              </Field>
              <Field label="Mobile Network" required>
                <input name="mobileNetwork" value={form.mobileNetwork} onChange={update} required placeholder="e.g. Globe, Smart, DITO" />
              </Field>
              <Field label="Storage Capacity (GB)" required>
                <input name="storageCapacity" type="number" min="0" value={form.storageCapacity} onChange={update} required placeholder="e.g. 128" />
              </Field>
              <Field label="RAM (GB)" required>
                <input name="ram" type="number" min="0" value={form.ram} onChange={update} required placeholder="e.g. 8" />
              </Field>
              <Field label="Year Model" required>
                <Select name="yearModel" value={form.yearModel} onChange={update} options={yearOptions(form.yearModel, 2010)} required />
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
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={cellphoneAcquisitions} required />
              </Field>
              <Field label="Issued to" required>
                <input name="issuedTo" value={form.issuedTo} onChange={update} required />
              </Field>
            </fieldset>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="cellphoneStatus" value={form.status} onChange={update} options={statuses} required />
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
                  <Field label="Specify the cellphone's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Under Maintenance" ? (
                <>
                  <Field label="Target Date to be Fixed" required>
                    <input name="targetFixDate" type="date" value={form.targetFixDate} onChange={update} required />
                  </Field>
                  <Field label="Specify the cellphone's problem or defect." wide required>
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
                    <Select name="yearMissing" value={form.yearMissing} onChange={update} options={yearOptions(form.yearMissing, 2000)} required />
                  </Field>
                  <Field label="Remarks" wide required>
                    <textarea name="remarks" rows={3} value={form.remarks} onChange={update} required />
                  </Field>
                </>
              ) : null}
            </div>
            {form.status === "Missing" ? null : (
              <fieldset className="form-grid" disabled={fieldsLocked}>
                <Field label="Remarks" wide>
                  <textarea name="remarks" rows={3} value={form.remarks} onChange={update} />
                </Field>
              </fieldset>
            )}
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update cellphone" : "Save cellphone"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
