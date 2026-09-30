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
  sections,
  statuses,
  storageUnits,
} from "@/lib/computer-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const emptyForm = {
  equipmentType: "Laptop",
  computerName: "",
  systemModel: "",
  display: "",
  connectivity: "LAN and WiFi",
  brand: "",
  model: "",
  serialNumber: "",
  assetTag: "",
  processor: "",
  ram: "",
  ssdValue: "",
  ssdUnit: "GB",
  hddValue: "",
  hddUnit: "TB",
  gpu: "",
  os: "",
  province: "Laguna",
  municipality: "Calamba",
  office: "Calamba CPS",
  section: "Others",
  specificEndUser: "",
  accountablePerson: "",
  assignmentStatus: "Assigned",
  status: "Serviceable",
  condition: "Good",
  modeOfAcquisition: "Un-documented",
  dedicatedUse: "None",
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
  const hdd = splitStorage(row.hddStorage, "TB");
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

function Select({ name, value, onChange, options, disabled }) {
  return (
    <select name={name} value={value} onChange={onChange} disabled={disabled}>
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  );
}

export default function ComputerInventory({ initial = [], locations = [] }) {
  const [rows, setRows] = useState(initial);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const provinceOptions = useMemo(() => {
    const region = regionsIn(locations)[0];
    return officesIn(locations, region).map((unit) => officeLabel(unit));
  }, [locations]);

  const stationOptions = useMemo(() => {
    const unit = officesIn(locations, regionsIn(locations)[0]).find((item) => officeLabel(item) === form.province);
    return stationsIn(locations, unit);
  }, [locations, form.province]);

  useEffect(() => {
    if (!provinceOptions.length) return;
    setForm((current) => {
      if (editingId) return current;
      const province = provinceOptions.includes(current.province) ? current.province : provinceOptions[0];
      const unit = officesIn(locations, regionsIn(locations)[0]).find((item) => officeLabel(item) === province);
      const stations = stationsIn(locations, unit);
      const municipality = stations.some((row) => row.name === current.municipality) ? current.municipality : stations[0]?.name || "";
      const office = unit || "";
      if (province === current.province && municipality === current.municipality && office === current.office) return current;
      return { ...current, province, municipality, office };
    });
  }, [locations, provinceOptions, editingId]);

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

  const title = useMemo(() => (mode === "edit" ? "Edit computer equipment" : mode === "add" ? "Add computer equipment" : "Computer"), [mode]);

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
    setError("");
    setMode("list");
  }

  function editRow(row) {
    setForm(formFromRow(row));
    setEditingId(row.id);
    setControlNumber(row.controlNumber || "");
    setError("");
    setMode("edit");
  }

  async function removeRow(row) {
    if (!window.confirm(`Delete ${row.controlNumber}?`)) return;
    setError("");
    const response = await fetch(`/api/computers?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this computer.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/computers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.computer) {
        setError(data.error || "Could not save this computer.");
        return;
      }
      setRows((current) => [data.computer, ...current.filter((row) => row.id !== data.computer.id)]);
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
          <button className="add-btn" type="button" onClick={() => { setEditingId(""); setForm(emptyForm); setMode("add"); }}>Add</button>
        ) : null}
      </header>

      {mode === "list" ? (
        <section className="panel-card">
          {error ? <p className="error" role="alert">{error}</p> : null}
          {rows.length === 0 ? (
            <p className="hint">No computers encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    <th>Actions</th>
                    {computerColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.controlNumber}>
                      <td>
                        <div className="row-actions">
                          <button className="row-btn" type="button" onClick={() => editRow(row)}>Edit</button>
                          <button className="row-btn danger" type="button" onClick={() => removeRow(row)}>Delete</button>
                        </div>
                      </td>
                      {computerColumns.map(([key]) => <td key={key}>{row[key] || "—"}</td>)}
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
            <h2>Basic information</h2>
            <div className="form-grid">
              <Field label="Control Number" required>
                <input value={controlNumber} disabled />
              </Field>
              <Field label="Equipment Type" required>
                <Select name="equipmentType" value={form.equipmentType} onChange={update} options={equipmentTypes} />
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
            </div>
          </section>

          <section className="panel-card">
            <h2>Computer specifications</h2>
            <div className="form-grid">
              <Field label="Processor">
                <input name="processor" value={form.processor} onChange={update} placeholder="hal. Intel Core i5-1240P" />
              </Field>
              <Field label="RAM (GB)">
                <input name="ram" type="number" min="1" value={form.ram} onChange={update} placeholder="hal. 16" />
              </Field>
              <Field label="SSD Storage">
                <span className="storage-row">
                  <input name="ssdValue" type="number" min="0" value={form.ssdValue} onChange={update} placeholder="hal. 512" />
                  <Select name="ssdUnit" value={form.ssdUnit} onChange={update} options={storageUnits} />
                </span>
              </Field>
              <Field label="HDD Storage">
                <span className="storage-row">
                  <input name="hddValue" type="number" min="0" value={form.hddValue} onChange={update} placeholder="hal. 1" />
                  <Select name="hddUnit" value={form.hddUnit} onChange={update} options={storageUnits} />
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
                <Select name="province" value={form.province} onChange={update} disabled={provinceOptions.length <= 1} options={provinceOptions.length ? provinceOptions : [form.province]} />
              </Field>
              <Field label="Station" required>
                <Select
                  name="municipality"
                  value={form.municipality}
                  onChange={update}
                  options={stationOptions.length ? stationOptions.map((row) => ({ value: row.name, label: `${row.name} (${row.classification})` })) : [form.municipality]}
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
                <Select name="assignmentStatus" value={form.assignmentStatus} onChange={update} options={assignmentStatuses} />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Status and condition</h2>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="status" value={form.status} onChange={update} options={statuses} />
              </Field>
              <Field label="Condition" required>
                <Select name="condition" value={form.condition} onChange={update} options={conditions} />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Acquisition and warranty</h2>
            <div className="form-grid">
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={acquisitions} />
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
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Update equipment" : "Save equipment"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
