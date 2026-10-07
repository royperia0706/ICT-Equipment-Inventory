"use client";

import AddButton from "@/components/AddButton";
import FocusableRow from "@/components/FocusableRow";
import MassUpload from "@/components/MassUpload";
import { CancelEditButton, PendingButtons, PendingNotes } from "@/components/PendingActions";
import { useEffect, useMemo, useState } from "react";
import {
  acquisitions,
  assignmentStatuses,
  computerColumns,
  conditionsByStatus,
  connectivityOptions,
  computerSeries,
  dedicatedUses,
  equipmentTypes,
  formatControl,
  acquireYears,
  licenseStatuses,
  ramSizes,
  statuses,
  storageUnits,
} from "@/lib/computer-fields";
import { agingLabel, columnsWithAging } from "@/lib/aging";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const emptyForm = {
  equipmentType: "",
  computerName: "",
  display: "",
  size: "",
  connectivity: "",
  brand: "",
  monitorBrand: "",
  dateManufacture: "",
  model: "",
  serialNumber: "",
  processor: "",
  frequency: "",
  numberOfCores: "",
  ram: "",
  ssdValue: "",
  ssdUnit: "GB",
  hddValue: "",
  hddUnit: "GB",
  gpu: "",
  videoCapacity: "",
  os: "",
  osStatus: "",
  antivirus: "",
  antivirusStatus: "",
  officeSoftware: "",
  officeStatus: "",
  province: "",
  municipality: "",
  office: "",
  section: "",
  specificEndUser: "",
  assignmentStatus: "",
  status: "",
  condition: "",
  targetFixDate: "",
  problemDetail: "",
  dateAssessed: "",
  reasonForBer: "",
  yearMissing: "",
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
    display: row.display || "",
    size: row.size || "",
    connectivity: row.connectivity || emptyForm.connectivity,
    brand: row.brand || "",
    monitorBrand: row.monitorBrand || "",
    dateManufacture: row.dateManufacture || "",
    model: row.model || "",
    serialNumber: row.serialNumber || "",
    processor: row.processor || "",
    frequency: row.speed && row.numberOfCores == null && row.logicalProcessor == null ? row.speed : row.frequency || "",
    numberOfCores: row.numberOfCores || (row.speed && row.numberOfCores == null && row.logicalProcessor == null ? row.frequency : ""),
    ram: String(row.ram || "").replace(/\s*GB$/i, ""),
    ssdValue: ssd.value,
    ssdUnit: ssd.unit,
    hddValue: hdd.value,
    hddUnit: hdd.unit,
    gpu: row.gpu || "",
    videoCapacity: row.videoCapacity || "",
    os: row.os || "",
    osStatus: row.osStatus || "",
    antivirus: row.antivirus || "",
    antivirusStatus: row.antivirusStatus || "",
    officeSoftware: row.officeSoftware || "",
    officeStatus: row.officeStatus || "",
    province: row.province || emptyForm.province,
    municipality: row.municipality || "",
    office: row.office || "",
    section: row.section || emptyForm.section,
    specificEndUser: row.specificEndUser || "",
    assignmentStatus: row.assignmentStatus || emptyForm.assignmentStatus,
    status: statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : "",
    condition: (conditionsByStatus[statuses.includes(row.status) ? row.status : statuses.includes(row.pendingStatus) ? row.pendingStatus : ""] || []).includes(row.condition) ? row.condition : "",
    targetFixDate: row.targetFixDate || "",
    problemDetail: row.problemDetail || "",
    dateAssessed: row.dateAssessed || "",
    reasonForBer: row.reasonForBer || "",
    yearMissing: row.yearMissing || "",
    modeOfAcquisition: row.modeOfAcquisition || emptyForm.modeOfAcquisition,
    dedicatedUse: known ? row.dedicatedUse : row.dedicatedUse ? "Others" : "",
    dedicatedUseOthers: known ? "" : row.dedicatedUse || "",
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

export default function ComputerInventory({ initial = [], locations = [], user = null }) {
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
  const yearChoices = useMemo(() => {
    const years = acquireYears();
    const current = String(form.dateAcquired || "").slice(0, 4);
    return current && !years.includes(current) ? [current, ...years] : years;
  }, [form.dateAcquired]);
  const listColumns = [
    ["controlNumber", "Control Number"],
    ["entryDate", "Entry Date"],
    ["equipmentType", "Equipment Type"],
    ["computerName", "Computer Name"],
    ["display", "Type of Monitor"],
    ["size", "Size"],
    ["brand", "System Unit/CPU Brand"],
    ["processor", "Processor"],
    ["ram", "RAM"],
    ["ssdStorage", "SSD Storage"],
    ["hddStorage", "HDD Storage"],
    ["aging", "Aging"],
  ];

  function needsApproval() {
    const ber = /^(for\s*ber|ber)$/i.test(form.status) || /^(for\s*ber|ber)$/i.test(form.condition);
    if (ber && user?.role !== "super-admin") return true;
    return Boolean(editingId) && user?.role !== "super-admin";
  }

  const title = mode === "edit" ? "Edit computer equipment" : mode === "add" ? "Add computer equipment" : mode === "view" ? "Computer details" : "Computer";
  const editingRow = rows.find((row) => row.id === editingId) || null;
  const fieldsLocked = Boolean(editingId) && user?.role !== "super-admin" && !editingRow?.editGranted;

  function cellValue(row, key) {
    if (key === "aging") return agingLabel(row.dateAcquired);
    if (key === "status" && row.status === "Pending" && row.pendingStatus) return `Pending · ${row.pendingStatus}`;
    return row[key] || "—";
  }

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
    if (name === "equipmentType") {
      setForm((current) => ({
        ...current,
        equipmentType: value,
        ...(value === "Laptop"
          ? { brand: "N/A", monitorBrand: "N/A" }
          : current.equipmentType === "Laptop"
            ? {
              brand: current.brand === "N/A" ? "" : current.brand,
              monitorBrand: current.monitorBrand === "N/A" ? "" : current.monitorBrand,
            }
            : {}),
      }));
      return;
    }
    if (name === "status" || name === "computerStatus") {
      setForm((current) => ({
        ...current,
        status: value,
        condition: "",
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

  async function decide(row, decision, target) {
    setError("");
    setNotice("");
    const response = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipment: "computer", id: row.id, decision, target }),
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
    if (data.record) {
      setRows((current) => current.map((item) => (item.id === data.record.id ? data.record : item)));
    }
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
      const response = await fetch("/api/computers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, requestEditAccess: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.computer) {
        setError(data.error || "Could not request edit access.");
        return;
      }
      setRows((current) => current.map((item) => (item.id === data.computer.id ? data.computer : item)));
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
          <div className="head-actions">
            <MassUpload kind="computer" user={user} locations={locations} onLoaded={setRows} />
            <AddButton onClick={() => { setEditingId(""); setBasicRequest(false); setForm(emptyForm); setMode("add"); }} />
          </div>
        ) : null}
      </header>

      {mode === "view" && viewing ? (
        <section className="panel-card">
          <h2>{viewing.controlNumber || "Computer"}</h2>
          <dl className="detail-grid">
            {columns.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{cellValue(viewing, key)}</dd>
              </div>
            ))}
          </dl>
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={() => { setViewing(null); setMode("list"); }}>Back</button>
          </div>
        </section>
      ) : mode === "list" ? (
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
                    {listColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <FocusableRow key={row.id || row.controlNumber} focusKey={row.controlNumber || row.id}>
                      {listColumns.map(([key]) => (
                        <td key={key}>{cellValue(row, key)}</td>
                      ))}
                      <td>
                        <div className="row-actions">
                          <button className="row-btn" type="button" onClick={() => editRow(row)}>Edit</button>
                          {user?.role === "encoder" ? null : (
                            <button className="row-btn danger" type="button" onClick={() => removeRow(row)}>Delete</button>
                          )}
                          <button className="row-btn" type="button" onClick={() => { setViewing(row); setMode("view"); }}>View data</button>
                          <PendingButtons user={user} row={row} onDecide={decide} />
                          <CancelEditButton user={user} row={row} api="/api/computers" recordKey="computer" onDone={applyCancel} />
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
        <form key={editingId || "new-computer"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
          <section className="panel-card">
            <div className="section-head">
              <h2>Basic information</h2>
              {editingId && user?.role !== "super-admin" && !editingRow?.editGranted ? (
                user?.role === "encoder" && editingRow?.editRequest === "pending" ? (
                  <CancelEditButton user={user} row={editingRow} api="/api/computers" recordKey="computer" variant="ghost" onDone={applyCancel} />
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
              <Field label="Equipment Type" required>
                <Select name="equipmentType" value={form.equipmentType} onChange={update} options={equipmentTypes} required />
              </Field>
              <Field label="Computer Name" required>
                <input name="computerName" value={form.computerName} onChange={update} placeholder="hal. NPCS-UNIT-001" required />
              </Field>
              <Field label="Type of Monitor" required>
                <input name="display" value={form.display} onChange={update} placeholder="hal. LCD, LED" required />
              </Field>
              <Field label="Size" required>
                <input name="size" value={form.size} onChange={update} placeholder="hal. 14-inch" required />
              </Field>
              <Field label="Connectivity" required>
                <Select name="connectivity" value={form.connectivity} onChange={update} options={connectivityOptions} required />
              </Field>
              {form.equipmentType === "Laptop" ? null : (
                <>
                  <Field label="System Unit/CPU Brand" required>
                    <input name="brand" value={form.brand} onChange={update} required />
                  </Field>
                  <Field label="Monitor Brand" required>
                    <input name="monitorBrand" value={form.monitorBrand} onChange={update} required />
                  </Field>
                </>
              )}
              <Field label="Date Manufacture" required>
                <input name="dateManufacture" type="date" value={form.dateManufacture} onChange={update} required />
              </Field>
              <Field label="Model">
                <input name="model" value={form.model} onChange={update} />
              </Field>
              <Field label="Serial Number" required>
                <input name="serialNumber" value={form.serialNumber} onChange={update} required />
              </Field>
            </fieldset>
          </section>

          <fieldset className="lock-fields" disabled={fieldsLocked}>
          <section className="panel-card">
            <h2>Computer specifications</h2>
            <div className="form-grid">
              <Field label="Processor" required>
                <input name="processor" value={form.processor} onChange={update} placeholder="hal. Intel Core i5" required />
              </Field>
              <Field label="Frequency" required>
                <input name="frequency" value={form.frequency} onChange={update} placeholder="hal. 2.4 GHz" required />
              </Field>
              <Field label="Number of Cores">
                <input name="numberOfCores" value={form.numberOfCores} onChange={update} />
              </Field>
              <Field label="RAM (GB)" required>
                <Select name="ram" value={form.ram} onChange={update} options={ramSizes.includes(form.ram) || !form.ram ? ramSizes : [form.ram, ...ramSizes]} required />
              </Field>
              <Field label="SSD Storage" required>
                <span className="storage-row">
                  <input name="ssdValue" type="number" min="0" value={form.ssdValue} onChange={update} placeholder="hal. 0" required />
                  <Select name="ssdUnit" value={form.ssdUnit} onChange={update} options={storageUnits} blank={false} />
                </span>
              </Field>
              <Field label="HDD Storage" required>
                <span className="storage-row">
                  <input name="hddValue" type="number" min="0" value={form.hddValue} onChange={update} placeholder="hal. 0" required />
                  <Select name="hddUnit" value={form.hddUnit} onChange={update} options={storageUnits} blank={false} />
                </span>
              </Field>
              <Field label="Video Card" required>
                <input name="gpu" value={form.gpu} onChange={update} placeholder="hal. NVIDIA RTX 3050" required />
              </Field>
              <Field label="Capacity" required>
                <input name="videoCapacity" value={form.videoCapacity} onChange={update} placeholder="hal. 4 GB" required />
              </Field>
              <Field label="Operating System" required>
                <input name="os" value={form.os} onChange={update} placeholder="hal. Windows 11 Pro" required />
              </Field>
              <Field label="Status" required>
                <Select name="osStatus" value={form.osStatus} onChange={update} options={licenseStatuses} required />
              </Field>
              <Field label="Anti-Virus/End Point Security" required>
                <input name="antivirus" value={form.antivirus} onChange={update} required />
              </Field>
              <Field label="Status" required>
                <Select name="antivirusStatus" value={form.antivirusStatus} onChange={update} options={licenseStatuses} required />
              </Field>
              <Field label="Office Productivity Software" required>
                <input name="officeSoftware" value={form.officeSoftware} onChange={update} placeholder="hal. Microsoft 365" required />
              </Field>
              <Field label="Status" required>
                <Select name="officeStatus" value={form.officeStatus} onChange={update} options={licenseStatuses} required />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>User and Accountability</h2>
            <div className="form-grid">
              <Field label="Section" required>
                <input name="section" value={form.section} onChange={update} required />
              </Field>
              <Field label="End User" required>
                <input name="specificEndUser" value={form.specificEndUser} onChange={update} placeholder="Name of the end user" required />
              </Field>
              <Field label="Assignment Status" required>
                <Select name="assignmentStatus" value={form.assignmentStatus} onChange={update} options={form.assignmentStatus && !assignmentStatuses.includes(form.assignmentStatus) ? [form.assignmentStatus, ...assignmentStatuses] : assignmentStatuses} required />
              </Field>
            </div>
          </section>
          </fieldset>

          <section className="panel-card">
            <h2>Status and condition</h2>
            <div className="form-grid">
              <Field label="Computer Status" required>
                <Select name="computerStatus" value={form.status} onChange={update} options={statuses} required />
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
                  <Field label="Specify the computer's problem or defect." wide required>
                    <textarea className="problem-field" name="problemDetail" rows={4} value={form.problemDetail} onChange={update} required />
                  </Field>
                </>
              ) : null}
              {form.status === "Under Maintenance" ? (
                <>
                  <Field label="Target Date to be Fixed" required>
                    <input name="targetFixDate" type="date" value={form.targetFixDate} onChange={update} required />
                  </Field>
                  <Field label="Specify the computer's problem or defect." wide required>
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
                    <Select name="yearMissing" value={form.yearMissing} onChange={update} options={form.yearMissing && !acquireYears().includes(String(form.yearMissing)) ? [String(form.yearMissing), ...acquireYears()] : acquireYears()} required />
                  </Field>
                  <Field label="Remarks" wide required>
                    <textarea name="remarks" rows={3} value={form.remarks} onChange={update} required />
                  </Field>
                </>
              ) : null}
            </div>
          </section>

          <fieldset className="lock-fields" disabled={fieldsLocked}>
          <section className="panel-card">
            <h2>Acquisition and warranty</h2>
            <div className="form-grid">
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={form.modeOfAcquisition && !acquisitions.includes(form.modeOfAcquisition) ? [form.modeOfAcquisition, ...acquisitions] : acquisitions} required />
              </Field>
              <Field label="Dedicated Use For" required>
                <Select name="dedicatedUse" value={form.dedicatedUse} onChange={update} options={form.dedicatedUse && !dedicatedUses.includes(form.dedicatedUse) ? [form.dedicatedUse, ...dedicatedUses] : dedicatedUses} required />
              </Field>
              {form.dedicatedUse === "Others" ? (
                <Field label="Others (Please Specify:)" required>
                  <input name="dedicatedUseOthers" value={form.dedicatedUseOthers} onChange={update} placeholder="Ilagay ang detalye..." required />
                </Field>
              ) : null}
              <Field label="Year Acquired" required>
                <Select name="dateAcquired" value={form.dateAcquired} onChange={update} options={yearChoices} required />
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
                <textarea name="remarks" rows={3} value={form.remarks} onChange={update} />
              </Field>
            </section>
          )}
          </fieldset>

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
