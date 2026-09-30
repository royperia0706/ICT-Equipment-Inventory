"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acquisitions,
  assignmentStatuses,
  computerColumns,
  conditions,
  connectivityOptions,
  computerSeries,
  dedicatedUses,
  equipmentTypes,
  formatControl,
  ramSizes,
  sections,
  statuses,
  storageUnits,
} from "@/lib/computer-fields";
import { agingLabel, columnsWithAging } from "@/lib/aging";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const emptyForm = {
  equipmentType: "",
  computerName: "",
  systemModel: "",
  display: "",
  connectivity: "",
  brand: "",
  model: "",
  serialNumber: "",
  assetTag: "",
  processor: "",
  ram: "",
  ssdValue: "",
  ssdUnit: "GB",
  hddValue: "",
  hddUnit: "GB",
  gpu: "",
  os: "",
  province: "",
  municipality: "",
  office: "",
  section: "",
  specificEndUser: "",
  accountablePerson: "",
  assignmentStatus: "",
  status: "",
  condition: "",
  modeOfAcquisition: "",
  dedicatedUse: "",
  dedicatedUseOthers: "",
  dateAcquired: "",
  acquisitionCost: "",
  remarks: "",
};

function splitStorage(label, fallback) {
  const match = String(label || "").trim().match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?$/i);
  if (!match) return { value: "", unit: fallback };
  return { value: match[1], unit: (match[2] || fallback).toUpperCase() };
}

function formFromRow(row) {
  const ssd = splitStorage(row.ssdStorage, "GB");
  const hdd = splitStorage(row.hddStorage, "GB");
  const known = dedicatedUses.includes(row.dedicatedUse);
  return {
    ...emptyForm,
    equipmentType: row.equipmentType || emptyForm.equipmentType,
    computerName: row.computerName || "",
    systemModel: row.systemModel || "",
    display: row.display || "",
    connectivity: row.connectivity || emptyForm.connectivity,
    brand: row.brand || "",
    model: row.model || "",
    serialNumber: row.serialNumber || "",
    assetTag: row.assetTag || "",
    processor: row.processor || "",
    ram: String(row.ram || "").replace(/\s*GB$/i, ""),
    ssdValue: ssd.value,
    ssdUnit: ssd.unit,
    hddValue: hdd.value,
    hddUnit: hdd.unit,
    gpu: row.gpu || "",
    os: row.os || "",
    province: row.province || emptyForm.province,
    municipality: row.municipality || "",
    office: row.office || "",
    section: row.section || emptyForm.section,
    specificEndUser: row.specificEndUser || "",
    accountablePerson: row.accountablePerson || "",
    assignmentStatus: row.assignmentStatus || emptyForm.assignmentStatus,
    status: row.status || emptyForm.status,
    condition: row.condition || emptyForm.condition,
    modeOfAcquisition: row.modeOfAcquisition || emptyForm.modeOfAcquisition,
    dedicatedUse: known ? row.dedicatedUse : row.dedicatedUse ? "Others" : "None",
    dedicatedUseOthers: known ? "" : row.dedicatedUse || "",
    dateAcquired: row.dateAcquired || "",
    acquisitionCost: row.acquisitionCost || "",
    remarks: row.remarks || "",
  };
}

function Field({ label, required, children }) {
  return (
    <label>
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function Select({ name, value, onChange, options, disabled, required, blank = true }) {
  return (
    <select name={name} value={value} onChange={onChange} disabled={disabled} required={required}>
      {blank ? <option value="">--Select--</option> : null}
      {options.filter(Boolean).map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  );
}

export default function ComputerInventory({ initial = [], locations = [], user = null }) {
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
    setControlNumber(formatControl(computerSeries, 1));
    const params = new URLSearchParams({
      preview: "1",
      municipality: form.municipality,
      office: form.office,
    });
    fetch(`/api/computers?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.controlNumber) setControlNumber(data.controlNumber);
      })
      .catch(() => {});
  }, [mode, form.municipality, form.office]);

  const columns = useMemo(() => columnsWithAging(computerColumns), []);

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

  const title = mode === "edit" ? "Edit computer equipment" : mode === "add" ? "Add computer equipment" : "Computer";

  function update(event) {
    const { name, value } = event.target;
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
    const pendingDelete = user?.role === "encoder";
    const question = pendingDelete
      ? `Submit ${row.controlNumber} for deletion? An Assistant Admin or Super Admin must approve it.`
      : `Delete ${row.controlNumber}?`;
    if (!window.confirm(question)) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/computers?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this computer.");
      return;
    }
    if (data.pending && data.computer) {
      setRows((current) => current.map((item) => (item.id === data.computer.id ? data.computer : item)));
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
      body: JSON.stringify({ equipment: "computer", id: row.id, decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this request.");
      return;
    }
    if (data.removed || decision === "approve" && row.pendingAction === "delete") {
      setRows((current) => current.filter((item) => item.id !== row.id));
      return;
    }
    if (data.record) {
      setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/computers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.computer) {
        setError(data.error || "Could not save this computer.");
        return;
      }
      setRows((current) => [data.computer, ...current.filter((row) => row.id !== data.computer.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this computer.");
    } finally {
      setBusy(false);
    }
  }

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
            <p className="hint">No computers encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    <th className="freeze">Actions</th>
                    {columns.map(([key, label]) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.controlNumber}>
                      <td className="freeze">
                        <div className="row-actions">
                          <button className="row-btn" type="button" onClick={() => editRow(row)}>Edit</button>
                          <button className="row-btn danger" type="button" onClick={() => removeRow(row)}>Delete</button>
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
                      {columns.map(([key]) => (
                        <td key={key}>
                          {key === "aging"
                            ? agingLabel(row.dateAcquired)
                            : key === "status" && row.status === "Pending" && row.pendingStatus
                              ? `Pending · ${row.pendingStatus}`
                              : row[key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <form className="computer-form" onSubmit={onSubmit}>
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
              <Field label="Equipment Type" required>
                <Select name="equipmentType" value={form.equipmentType} onChange={update} options={equipmentTypes} required />
              </Field>
              <Field label="Computer Name">
                <input name="computerName" value={form.computerName} onChange={update} placeholder="hal. NPCS-UNIT-001" />
              </Field>
              <Field label="System Model">
                <input name="systemModel" value={form.systemModel} onChange={update} placeholder="hal. Latitude 5420" />
              </Field>
              <Field label="Display">
                <input name="display" value={form.display} onChange={update} placeholder="hal. 14-inch FHD" />
              </Field>
              <Field label="Connectivity">
                <Select name="connectivity" value={form.connectivity} onChange={update} options={connectivityOptions} />
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
              <Field label="Asset Tag">
                <input name="assetTag" value={form.assetTag} onChange={update} />
              </Field>
            </fieldset>
          </section>

          <section className="panel-card">
            <h2>Computer specifications</h2>
            <div className="form-grid">
              <Field label="Processor">
                <input name="processor" value={form.processor} onChange={update} placeholder="hal. Intel Core i5-1240P" />
              </Field>
              <Field label="RAM (GB)">
                <Select name="ram" value={form.ram} onChange={update} options={ramSizes.includes(form.ram) || !form.ram ? ramSizes : [form.ram, ...ramSizes]} />
              </Field>
              <Field label="SSD Storage">
                <span className="storage-row">
                  <input name="ssdValue" type="number" min="0" value={form.ssdValue} onChange={update} placeholder="hal. 512" />
                  <Select name="ssdUnit" value={form.ssdUnit} onChange={update} options={storageUnits} blank={false} />
                </span>
              </Field>
              <Field label="HDD Storage">
                <span className="storage-row">
                  <input name="hddValue" type="number" min="0" value={form.hddValue} onChange={update} placeholder="hal. 1" />
                  <Select name="hddUnit" value={form.hddUnit} onChange={update} options={storageUnits} blank={false} />
                </span>
              </Field>
              <Field label="GPU">
                <input name="gpu" value={form.gpu} onChange={update} placeholder="hal. NVIDIA RTX 3050 / Integrated" />
              </Field>
              <Field label="Operating System">
                <input name="os" value={form.os} onChange={update} placeholder="hal. Windows 11 Pro" />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Location and accountability</h2>
            <div className="form-grid">
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
                  options={stationOptions.map((row) => ({ value: row.name, label: `${row.name} (${row.classification})` }))}
                  disabled={stationOptions.length <= 1}
                />
              </Field>
              <Field label="Section">
                <Select name="section" value={form.section} onChange={update} options={sections} />
              </Field>
              <Field label="Specific End User">
                <input name="specificEndUser" value={form.specificEndUser} onChange={update} placeholder="Pangalan ng end user" />
              </Field>
              <Field label="Accountable Person">
                <input name="accountablePerson" value={form.accountablePerson} onChange={update} placeholder="Pangalan ng taong may pananagutan" />
              </Field>
              <Field label="Assignment Status" required>
                <Select name="assignmentStatus" value={form.assignmentStatus} onChange={update} options={assignmentStatuses} required />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Status and condition</h2>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="status" value={form.status} onChange={update} options={statuses} required />
              </Field>
              <Field label="Condition" required>
                <Select name="condition" value={form.condition} onChange={update} options={conditions} required />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Acquisition and warranty</h2>
            <div className="form-grid">
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={acquisitions} required />
              </Field>
              <Field label="Dedicated Use For">
                <Select name="dedicatedUse" value={form.dedicatedUse} onChange={update} options={dedicatedUses} />
              </Field>
              {form.dedicatedUse === "Others" ? (
                <Field label="Others (Please Specify:)">
                  <input name="dedicatedUseOthers" value={form.dedicatedUseOthers} onChange={update} placeholder="Ilagay ang detalye..." />
                </Field>
              ) : null}
              <Field label="Date Acquired" required>
                <input name="dateAcquired" type="date" value={form.dateAcquired} onChange={update} required />
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

          <section className="panel-card">
            <h2>Remarks</h2>
            <Field label="Remarks">
              <textarea name="remarks" rows={3} value={form.remarks} onChange={update} />
            </Field>
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update equipment" : "Save equipment"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
