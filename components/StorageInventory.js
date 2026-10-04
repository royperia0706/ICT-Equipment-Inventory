"use client";

import { useEffect, useMemo, useState } from "react";
import { acquireYears, conditionsByStatus, statuses, storageUnits } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";
import { storageAcquisitions, storageColumns, storageTechnologies } from "@/lib/storage-fields";

const emptyForm = {
  storageType: "",
  brand: "",
  model: "",
  serialNumber: "",
  capacityValue: "",
  capacityUnit: "GB",
  storageTechnology: "",
  dateAcquired: "",
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

function yearOptions(current) {
  const years = acquireYears();
  const saved = String(current || "");
  if (saved && !years.includes(saved)) return [saved, ...years];
  return years;
}

function splitCapacity(value) {
  const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)\s*(GB|TB)$/i);
  if (!match) return { capacityValue: "", capacityUnit: "GB" };
  return { capacityValue: match[1], capacityUnit: match[2].toUpperCase() };
}

function formFromRow(row) {
  const status = statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : "";
  const capacity = splitCapacity(row.capacity);
  return {
    ...emptyForm,
    storageType: row.storageType || "",
    brand: row.brand || "",
    model: row.model || "",
    serialNumber: row.serialNumber || "",
    capacityValue: capacity.capacityValue,
    capacityUnit: capacity.capacityUnit,
    storageTechnology: storageTechnologies.includes(row.storageTechnology) ? row.storageTechnology : "",
    dateAcquired: String(row.dateAcquired || "").slice(0, 4),
    acquisitionCost: row.acquisitionCost || "",
    modeOfAcquisition: storageAcquisitions.includes(row.modeOfAcquisition) ? row.modeOfAcquisition : "",
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

export default function StorageInventory({ initial = [], locations = [], user = null }) {
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
    fetch(`/api/storages?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.controlNumber) setControlNumber(data.controlNumber);
      })
      .catch(() => {});
  }, [mode, form.municipality, form.office]);

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
    if (name === "status" || name === "storageStatus") {
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
    const response = await fetch(`/api/storages?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this storage.");
      return;
    }
    if (data.pending && data.storage) {
      setRows((current) => current.map((item) => (item.id === data.storage.id ? data.storage : item)));
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
      body: JSON.stringify({ equipment: "storage", id: row.id, decision }),
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
      const response = await fetch("/api/storages", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.storage) {
        setError(data.error || "Could not save this storage.");
        return;
      }
      setRows((current) => [data.storage, ...current.filter((row) => row.id !== data.storage.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this storage.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit storage" : mode === "add" ? "Add storage" : "Storage";
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
            <p className="hint">No storage encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {storageColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.controlNumber}>
                      {storageColumns.map(([key]) => (
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
        <form key={editingId || "new-storage"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
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
              <Field label="Storage Type" required>
                <input name="storageType" value={form.storageType} onChange={update} required placeholder="e.g. External Drive, NAS, Flash Drive" />
              </Field>
              <Field label="Brand" required>
                <input name="brand" value={form.brand} onChange={update} required />
              </Field>
              <Field label="Model" required>
                <input name="model" value={form.model} onChange={update} required />
              </Field>
              <Field label="Serial Number" required>
                <input name="serialNumber" value={form.serialNumber} onChange={update} required />
              </Field>
              <Field label="Capacity (GB/TB)" required>
                <span className="storage-row">
                  <input name="capacityValue" type="number" min="0" value={form.capacityValue} onChange={update} required placeholder="e.g. 0" />
                  <Select name="capacityUnit" value={form.capacityUnit} onChange={update} options={storageUnits} blank={false} />
                </span>
              </Field>
              <Field label="Storage Technology" required>
                <Select name="storageTechnology" value={form.storageTechnology} onChange={update} options={storageTechnologies} required />
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
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={storageAcquisitions} required />
              </Field>
              <Field label="Issued to" required>
                <input name="issuedTo" value={form.issuedTo} onChange={update} required />
              </Field>
              <Field label="Status" required>
                <Select name="storageStatus" value={form.status} onChange={update} options={statuses} required />
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
                  <Field label="Specify the storage's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Under Maintenance" ? (
                <>
                  <Field label="Target Date to be Fixed" required>
                    <input name="targetFixDate" type="date" value={form.targetFixDate} onChange={update} required />
                  </Field>
                  <Field label="Specify the storage's problem or defect." wide required>
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
              ) : (
                <Field label="Remarks" wide>
                  <textarea name="remarks" rows={3} value={form.remarks} onChange={update} />
                </Field>
              )}
            </fieldset>
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update storage" : "Save storage"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
