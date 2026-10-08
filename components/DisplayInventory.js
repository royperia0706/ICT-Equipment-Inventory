"use client";

import FocusableRow from "@/components/FocusableRow";
import InventoryActionMenu from "@/components/InventoryActionMenu";
import InventoryDetails from "@/components/InventoryDetails";
import MassUpload from "@/components/MassUpload";
import { CancelEditButton, PendingNotes } from "@/components/PendingActions";
import { useEffect, useMemo, useState } from "react";
import { agingLabel } from "@/lib/aging";
import { acquireYears, conditionsByStatus, statuses } from "@/lib/computer-fields";
import { displayTechnologies, inputPorts } from "@/lib/display-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const listColumns = [
  ["controlNumber", "Control Number"],
  ["entryDate", "Entry Date"],
  ["province", "Office"],
  ["municipality", "Station"],
  ["equipmentType", "Equipment Type"],
  ["screenSize", "Screen Size"],
  ["aging", "Aging"],
];

const emptyForm = {
  equipmentType: "",
  brand: "",
  model: "",
  serialNumber: "",
  screenSize: "",
  resolution: "",
  displayTechnology: "",
  inputPorts: "",
  dateAcquired: "",
  acquisitionCost: "",
  location: "",
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

function formFromRow(row) {
  const status = statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : "";
  return {
    ...emptyForm,
    equipmentType: row.equipmentType || "",
    brand: row.brand || "",
    model: row.model || "",
    serialNumber: row.serialNumber || "",
    screenSize: row.screenSize || "",
    resolution: row.resolution || "",
    displayTechnology: displayTechnologies.includes(row.displayTechnology) ? row.displayTechnology : "",
    inputPorts: inputPorts.includes(row.inputPorts) ? row.inputPorts : "",
    dateAcquired: String(row.dateAcquired || "").slice(0, 4),
    acquisitionCost: row.acquisitionCost || "",
    location: row.location || "",
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

export default function DisplayInventory({ initial = [], locations = [], user = null }) {
  const [rows, setRows] = useState(initial);
  const [mode, setMode] = useState("list");
  const [viewing, setViewing] = useState(null);
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
    fetch(`/api/displays?${params}`)
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
    if (name === "status" || name === "displayStatus") {
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
    const response = await fetch(`/api/displays?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this display.");
      return;
    }
    if (data.pending && data.display) {
      setRows((current) => current.map((item) => (item.id === data.display.id ? data.display : item)));
      setNotice(data.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    return true;
  }

  async function decide(row, decision, target) {
    setError("");
    setNotice("");
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipment: "display", id: row.id, decision, target }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this request.");
      return false;
    }
    if (data.removed || (decision === "approve" && row.pendingAction === "delete")) {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return true;
    }
    if (data.record) setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
    return true;
  }

  function applyCancel(data) {
    if (data.error) {
      setError(data.error);
      return;
    }
    setError("");
    if (data.record) setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
    setNotice(data.message || "Edit request cancelled.");
  }

  async function requestEdit() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/displays", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, requestEditAccess: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.display) {
        setError(data.error || "Could not request edit access.");
        return;
      }
      setRows((current) => current.map((item) => (item.id === data.display.id ? data.display : item)));
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
      const response = await fetch("/api/displays", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.display) {
        setError(data.error || "Could not save this display.");
        return;
      }
      setRows((current) => [data.display, ...current.filter((row) => row.id !== data.display.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this display.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit display" : mode === "add" ? "Add display" : mode === "view" ? "Display details" : "Display";
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
          <div className="head-actions">
            <MassUpload kind="display" user={user} locations={locations} onLoaded={setRows} />
            <button className="add-btn" type="button" onClick={() => { setEditingId(""); setBasicRequest(false); setForm(emptyForm); setMode("add"); }}>Add</button>
          </div>
        ) : null}
      </header>

      {mode === "view" && viewing ? (
        <InventoryDetails kind="display" row={viewing} onBack={() => { setViewing(null); setMode("list"); }} />
      ) : mode === "list" ? (
        <section className="panel-card">
          {error ? <p className="error" role="alert">{error}</p> : null}
          {notice ? <p className="hint">{notice}</p> : null}
          {rows.length === 0 ? (
            <p className="hint">No displays encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {listColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <FocusableRow key={row.id || row.controlNumber} focusKey={row.controlNumber || row.id}>
                      {listColumns.map(([key]) => (
                        <td key={key}>
                          {key === "aging"
                            ? agingLabel(row.dateAcquired)
                            : key === "status" && row.status === "Pending" && row.pendingStatus
                            ? `Pending · ${row.pendingStatus}`
                            : row[key] || "—"}
                        </td>
                      ))}
                      <td>
                        <InventoryActionMenu
                          user={user}
                          row={row}
                          busy={busy}
                          onEdit={editRow}
                          onDelete={removeRow}
                          onView={(item) => { setViewing(item); setMode("view"); }}
                          onDecide={decide}
                          cancelApi="/api/displays"
                          recordKey="display"
                          onCancelDone={applyCancel}
                        />
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
        <form key={editingId || "new-display"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
          <section className="panel-card">
            <div className="section-head">
              <h2>Basic information</h2>
              {editingId && user?.role !== "super-admin" && !editingRow?.editGranted ? (
                user?.role === "encoder" && editingRow?.editRequest === "pending" ? (
                  <CancelEditButton user={user} row={editingRow} api="/api/displays" recordKey="display" variant="ghost" onDone={applyCancel} />
                ) : (
                  <button className="ghost" type="button" disabled={editingRow?.editRequest === "pending" || busy} onClick={requestEdit}>
                    {editingRow?.editRequest === "pending" ? "Edit requested" : "Request Edit"}
                  </button>
                )
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
              <Field label="Equipment Type" required>
                <input name="equipmentType" value={form.equipmentType} onChange={update} required placeholder="e.g. Monitor, Projector, Television" />
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
              <Field label="Screen Size" required>
                <input name="screenSize" value={form.screenSize} onChange={update} required placeholder="e.g. 55-inch" />
              </Field>
              <Field label="Resolution" required>
                <input name="resolution" value={form.resolution} onChange={update} required placeholder="e.g. 1920 x 1080" />
              </Field>
              <Field label="Display Technology" required>
                <Select name="displayTechnology" value={form.displayTechnology} onChange={update} options={displayTechnologies} required />
              </Field>
              <Field label="Input Ports" required>
                <Select name="inputPorts" value={form.inputPorts} onChange={update} options={inputPorts} required />
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
              <Field label="Location" required>
                <input name="location" value={form.location} onChange={update} required placeholder="Office" />
              </Field>
              <Field label="Accountable Person" required>
                <input name="issuedTo" value={form.issuedTo} onChange={update} required />
              </Field>
            </fieldset>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="displayStatus" value={form.status} onChange={update} options={statuses} required />
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
                  <Field label="Specify the display's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Under Maintenance" ? (
                <>
                  <Field label="Target Date to be Fixed" required>
                    <input name="targetFixDate" type="date" value={form.targetFixDate} onChange={update} required />
                  </Field>
                  <Field label="Specify the display's problem or defect." wide required>
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
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update display" : "Save display"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
