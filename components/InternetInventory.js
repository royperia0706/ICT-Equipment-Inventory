"use client";

import FocusableRow from "@/components/FocusableRow";
import { PendingButtons, PendingNotes } from "@/components/PendingActions";
import { useEffect, useMemo, useState } from "react";
import { acquireYears } from "@/lib/computer-fields";
import { internetColumns, internetStatuses, wifiCapabilities } from "@/lib/internet-fields";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const emptyForm = {
  internetType: "",
  provider: "",
  connectionType: "",
  speed: "",
  wifiCapability: "",
  location: "",
  yearSubscribed: "",
  monthlySubscription: "",
  ipAddress: "",
  status: "",
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
  const status = internetStatuses.includes(row.status) ? row.status : internetStatuses.includes(row.pendingStatus) ? row.pendingStatus : "";
  return {
    ...emptyForm,
    internetType: row.internetType || "",
    provider: row.provider || "",
    connectionType: row.connectionType || "",
    speed: row.speed || "",
    wifiCapability: wifiCapabilities.includes(row.wifiCapability) ? row.wifiCapability : "",
    location: row.location || "",
    yearSubscribed: String(row.yearSubscribed || "").slice(0, 4),
    monthlySubscription: row.monthlySubscription || "",
    ipAddress: row.ipAddress || "",
    status,
    region: row.region || "",
    province: row.province || "",
    municipality: row.municipality || "",
    office: row.office || "",
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

export default function InternetInventory({ initial = [], locations = [], user = null }) {
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
    fetch(`/api/internets?${params}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.controlNumber) setControlNumber(data.controlNumber);
      })
      .catch(() => {});
  }, [mode, form.municipality, form.office]);

  const columns = internetColumns;

  function needsApproval() {
    return Boolean(editingId) && user?.role !== "super-admin";
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
    const response = await fetch(`/api/internets?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this internet record.");
      return;
    }
    if (data.pending && data.internet) {
      setRows((current) => current.map((item) => (item.id === data.internet.id ? data.internet : item)));
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
      body: JSON.stringify({ equipment: "internet", id: row.id, decision, target }),
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
      const response = await fetch("/api/internets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, requestEditAccess: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.internet) {
        setError(data.error || "Could not request edit access.");
        return;
      }
      setRows((current) => current.map((item) => (item.id === data.internet.id ? data.internet : item)));
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
      const response = await fetch("/api/internets", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId, requestBasicEdit: basicRequest } : form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.internet) {
        setError(data.error || "Could not save this internet record.");
        return;
      }
      setRows((current) => [data.internet, ...current.filter((row) => row.id !== data.internet.id)]);
      setNotice(data.pending ? data.message : "");
      setForm(emptyForm);
      setEditingId("");
      setMode("list");
    } catch {
      setError("Could not save this internet record.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "edit" ? "Edit internet" : mode === "add" ? "Add internet" : "Internet";
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
            <p className="hint">No internet connections encoded yet. Use Add to encode one.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {columns.map(([key, label]) => <th key={key}>{label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <FocusableRow key={row.id || row.controlNumber} focusKey={row.controlNumber || row.id}>
                      {columns.map(([key]) => (
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
        <form key={editingId || "new-internet"} className="computer-form dense-form" autoComplete="off" onSubmit={onSubmit}>
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
              <Field label="Internet Type" required>
                <input name="internetType" value={form.internetType} onChange={update} required placeholder="e.g. Fiber, DSL, LTE" />
              </Field>
              <Field label="Provider" required>
                <input name="provider" value={form.provider} onChange={update} required placeholder="e.g. PLDT, Globe, Converge" />
              </Field>
              <Field label="Connection Type" required>
                <input name="connectionType" value={form.connectionType} onChange={update} required placeholder="e.g. Fiber, Wireless, Leased Line" />
              </Field>
              <Field label="Speed" required>
                <input name="speed" value={form.speed} onChange={update} required placeholder="e.g. 100 Mbps" />
              </Field>
              <Field label="Wifi Capability" required>
                <Select name="wifiCapability" value={form.wifiCapability} onChange={update} options={wifiCapabilities} required />
              </Field>
              <Field label="Location (Office)" required>
                <input name="location" value={form.location} onChange={update} required placeholder="Office" />
              </Field>
              <Field label="Year Subscribed" required>
                <Select name="yearSubscribed" value={form.yearSubscribed} onChange={update} options={yearOptions(form.yearSubscribed)} required />
              </Field>
              <Field label="Monthly Subscription" required>
                <input
                  name="monthlySubscription"
                  value={form.monthlySubscription}
                  onChange={update}
                  required
                  onFocus={(event) => {
                    if (!event.target.value.startsWith("₱")) {
                      setForm((current) => ({ ...current, monthlySubscription: `₱${current.monthlySubscription}` }));
                    }
                  }}
                  placeholder="₱"
                />
              </Field>
              <Field label="IP Address" required>
                <input name="ipAddress" value={form.ipAddress} onChange={update} required placeholder="e.g. 192.168.1.1" />
              </Field>
            </fieldset>
            <div className="form-grid">
              <Field label="Status" required>
                <Select name="status" value={form.status} onChange={update} options={internetStatuses} required />
              </Field>
            </div>
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={cancel}>Cancel</button>
            <button type="submit" disabled={busy}>{busy ? "Saving…" : needsApproval() ? "Submit for approval" : editingId ? "Update internet" : "Save internet"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
