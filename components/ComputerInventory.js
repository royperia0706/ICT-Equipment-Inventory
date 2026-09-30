"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acquisitions,
  assignmentStatuses,
  computerColumns,
  conditions,
  connectivityOptions,
  controlPrefix,
  dedicatedUses,
  equipmentTypes,
  formatControl,
  sections,
  statuses,
  storageLabel,
  storageUnits,
} from "@/lib/computer-fields";
import { locationChoices, provinceOrder } from "@/lib/location-choices";

const LOCAL_KEY = "ict-computers";
const SEQ_KEY = "ict-computer-sequences";

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

function readLocal() {
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function readSequences() {
  try {
    return JSON.parse(localStorage.getItem(SEQ_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocal(rows, sequences) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  localStorage.setItem(SEQ_KEY, JSON.stringify(sequences));
}

function Field({ label, required, children }) {
  return (
    <label>
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function Select({ name, value, onChange, options }) {
  return (
    <select name={name} value={value} onChange={onChange}>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

export default function ComputerInventory({ initial = [], locations = [] }) {
  const [rows, setRows] = useState(initial);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(emptyForm);
  const [controlNumber, setControlNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial.length) return;
    setRows(readLocal());
  }, [initial]);

  const provinceOptions = useMemo(() => {
    const present = new Set(locations.map((row) => row.province));
    return provinceOrder.filter((name) => present.has(name));
  }, [locations]);

  const placeOptions = useMemo(
    () => locationChoices(locations, form.province),
    [locations, form.province]
  );

  useEffect(() => {
    if (!provinceOptions.length) return;
    setForm((current) => {
      const province = provinceOptions.includes(current.province) ? current.province : provinceOptions[0];
      const choices = locationChoices(locations, province);
      const municipality = choices.stations.includes(current.municipality) ? current.municipality : choices.stations[0] || "";
      const office = choices.offices.includes(current.office) ? current.office : choices.offices[0] || "";
      if (province === current.province && municipality === current.municipality && office === current.office) return current;
      return { ...current, province, municipality, office };
    });
  }, [locations, provinceOptions]);

  useEffect(() => {
    if (mode !== "add") return;
    const prefix = controlPrefix(form.municipality, form.office);
    const sequences = readSequences();
    setControlNumber(formatControl(prefix, (sequences[prefix] || 0) + 1));
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

  const title = useMemo(() => (mode === "add" ? "Add computer equipment" : "Computer"), [mode]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function cancel() {
    setForm(emptyForm);
    setError("");
    setMode("list");
  }

  function keepLocally() {
    const sequences = readSequences();
    const prefix = controlPrefix(form.municipality, form.office);
    const count = (sequences[prefix] || 0) + 1;
    const dedicated = form.dedicatedUse === "Others" ? form.dedicatedUseOthers.trim() || "Others" : form.dedicatedUse;
    const record = {
      id: `${prefix}-${count}`,
      controlNumber: formatControl(prefix, count),
      equipmentType: form.equipmentType,
      computerName: form.computerName.trim(),
      systemModel: form.systemModel.trim(),
      display: form.display.trim(),
      connectivity: form.connectivity,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      assetTag: form.assetTag.trim(),
      processor: form.processor.trim(),
      ram: form.ram.trim() ? `${form.ram.trim()} GB` : "",
      ssdStorage: storageLabel(form.ssdValue, form.ssdUnit),
      hddStorage: storageLabel(form.hddValue, form.hddUnit),
      gpu: form.gpu.trim(),
      os: form.os.trim(),
      province: form.province,
      municipality: form.municipality,
      office: form.office,
      section: form.section,
      specificEndUser: form.specificEndUser.trim(),
      accountablePerson: form.accountablePerson.trim(),
      assignmentStatus: form.assignmentStatus,
      status: form.status,
      condition: form.condition,
      modeOfAcquisition: form.modeOfAcquisition,
      dedicatedUse: dedicated,
      dateAcquired: form.dateAcquired,
      acquisitionCost: form.acquisitionCost.trim(),
      remarks: form.remarks.trim(),
    };
    const next = [record, ...readLocal()];
    sequences[prefix] = count;
    saveLocal(next, sequences);
    setRows(next);
    setForm(emptyForm);
    setMode("list");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/computers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && data.error === "Fill in the required fields.") {
        setError(data.error);
        return;
      }
      if (response.ok && data.computer) {
        const next = [data.computer, ...rows.filter((row) => row.id !== data.computer.id)];
        const prefix = controlPrefix(data.computer.municipality, data.computer.office);
        const count = Number(String(data.computer.controlNumber).split("-").pop()) || 1;
        saveLocal(next, { ...readSequences(), [prefix]: count });
        setRows(next);
        setForm(emptyForm);
        setMode("list");
        return;
      }
      keepLocally();
    } catch {
      keepLocally();
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
          <button className="add-btn" type="button" onClick={() => setMode("add")}>Add</button>
        ) : null}
      </header>

      {mode === "list" ? (
        <section className="panel-card">
          {rows.length === 0 ? (
            <p className="hint">No computers encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {computerColumns.map(([key, label]) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.controlNumber}>
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
              <Field label="Province" required>
                <Select name="province" value={form.province} onChange={update} options={provinceOptions.length ? provinceOptions : [form.province]} />
              </Field>
              <Field label="Station" required>
                <Select name="municipality" value={form.municipality} onChange={update} options={placeOptions.stations.length ? placeOptions.stations : [form.municipality]} />
              </Field>
              <Field label="Office" required>
                <Select name="office" value={form.office} onChange={update} options={placeOptions.offices.length ? placeOptions.offices : [form.office]} />
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
            <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save equipment"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
