"use client";

import { useEffect, useMemo, useState } from "react";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";
import {
  colorCapabilities,
  connectionTypes,
  printerAcquisitions,
  printerColumns,
  printerConditions,
  printerSections,
  printerStatuses,
} from "@/lib/printer-fields";

const emptyForm = {
  printerType: "",
  brand: "",
  model: "",
  serialNumber: "",
  assetTag: "",
  connectionType: "",
  ipAddress: "",
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
  modeOfAcquisition: "",
  dateAcquired: "",
  acquisitionCost: "",
  remarks: "",
};

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

export default function PrinterInventory({ initial = [], locations = [] }) {
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
    setForm({ ...emptyForm, ...row, acquisitionCost: row.acquisitionCost || "" });
    setEditingId(row.id);
    setControlNumber(row.controlNumber || "");
    setError("");
    setMode("edit");
  }

  async function removeRow(row) {
    if (!window.confirm(`Delete ${row.controlNumber}?`)) return;
    setError("");
    const response = await fetch(`/api/printers?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this printer.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/printers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.printer) {
        setError(data.error || "Could not save this printer.");
        return;
      }
      setRows((current) => [data.printer, ...current.filter((row) => row.id !== data.printer.id)]);
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
          <button className="add-btn" type="button" onClick={() => { setEditingId(""); setForm(emptyForm); setMode("add"); }}>Add</button>
        ) : null}
      </header>

      {mode === "list" ? (
        <section className="panel-card">
          {error ? <p className="error" role="alert">{error}</p> : null}
          {rows.length === 0 ? (
            <p className="hint">No printers encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    <th>Actions</th>
                    {printerColumns.map(([key, label]) => <th key={key}>{label}</th>)}
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
                      {printerColumns.map(([key]) => <td key={key}>{row[key] || "—"}</td>)}
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
              <Field label="Printer Type" required>
                <input name="printerType" value={form.printerType} onChange={update} required placeholder="Ilagay ang uri ng printer" />
              </Field>
              <Field label="Brand" required>
                <input name="brand" value={form.brand} onChange={update} required placeholder="Hal. HP, Canon, Epson" />
              </Field>
              <Field label="Model" required>
                <input name="model" value={form.model} onChange={update} required placeholder="Hal. LaserJet Pro M428fdw" />
              </Field>
              <Field label="Serial Number" required>
                <input name="serialNumber" value={form.serialNumber} onChange={update} required />
              </Field>
              <Field label="Asset Tag">
                <input name="assetTag" value={form.assetTag} onChange={update} placeholder="Hal. PRT-001" />
              </Field>
              <Field label="Connection Type" required>
                <Select name="connectionType" value={form.connectionType} onChange={update} options={connectionTypes} required />
              </Field>
              <Field label="IP Address">
                <input name="ipAddress" value={form.ipAddress} onChange={update} placeholder="Hal. 192.168.1.50" />
              </Field>
            </div>
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
                  disabled={stationOptions.length <= 1}
                  options={stationOptions.map((row) => ({ value: row.name, label: `${row.name} (${row.classification})` }))}
                />
              </Field>
              <Field label="Section">
                <Select name="section" value={form.section} onChange={update} options={printerSections} />
              </Field>
              <Field label="Accountable Person" required>
                <input name="accountablePerson" value={form.accountablePerson} onChange={update} required placeholder="Pangalan ng taong may pananagutan" />
              </Field>
              <Field label="Assigned User">
                <input name="assignedUser" value={form.assignedUser} onChange={update} placeholder="Pangalan ng gumagamit" />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Status and condition</h2>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="status" value={form.status} onChange={update} options={printerStatuses} required />
              </Field>
              <Field label="Condition" required>
                <Select name="condition" value={form.condition} onChange={update} options={printerConditions} required />
              </Field>
            </div>
          </section>

          <section className="panel-card">
            <h2>Acquisition and warranty</h2>
            <div className="form-grid">
              <Field label="Mode of Acquisition" required>
                <Select name="modeOfAcquisition" value={form.modeOfAcquisition} onChange={update} options={printerAcquisitions} required />
              </Field>
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
              <textarea name="remarks" rows={3} value={form.remarks} onChange={update} placeholder="Mga isyu, kasaysayan ng pagkukumpuni, atbp." />
            </Field>
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Update printer" : "Save printer"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
