"use client";

import { useMemo, useState } from "react";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const accessOptions = ["Encoder", "Assistant Admin", "Super Admin"];

const emptyForm = {
  username: "",
  password: "",
  unit: "",
  station: "",
  displayName: "",
  classification: "",
  access: "",
};

function Field({ label, required, children }) {
  return (
    <label>
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}

function canManage(user) {
  return user?.role === "assistant-admin" || user?.role === "super-admin";
}

function canChange(user, account) {
  if (!canManage(user) || !account) return false;
  if (account.role === "super-admin" && user.role !== "super-admin") return false;
  if (user.role === "assistant-admin" && account.unit !== user.unit) return false;
  return true;
}

export default function AccountsView({ accounts = [], user = null, locations = [] }) {
  const [rows, setRows] = useState(accounts);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const manager = canManage(user);
  const region = regionsIn(locations)[0] || "PRO 4A - CALABARZON";
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const stations = useMemo(() => {
    const list = stationsIn(locations, form.unit);
    if (form.station && !list.some((row) => row.name === form.station)) {
      return [{ unit: form.unit, name: form.station, classification: form.classification }, ...list];
    }
    return list;
  }, [locations, form.unit, form.station, form.classification]);
  const officeChoices = form.unit && !offices.includes(form.unit) ? [form.unit, ...offices] : offices;

  function update(event) {
    const { name, value } = event.target;
    if (name === "unit") {
      const nextStations = stationsIn(locations, value);
      const station = nextStations.length === 1 ? nextStations[0].name : "";
      setForm((current) => ({
        ...current,
        unit: value,
        station,
        displayName: station,
        classification: nextStations.length === 1 ? nextStations[0].classification : "",
      }));
      return;
    }
    if (name === "station") {
      const match = stations.find((row) => row.name === value);
      setForm((current) => ({
        ...current,
        station: value,
        displayName: value,
        classification: match?.classification || current.classification,
      }));
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openAdd() {
    const unit = user?.role === "assistant-admin" ? user.unit : offices[0] || "";
    const nextStations = stationsIn(locations, unit);
    setEditing(false);
    setForm({
      ...emptyForm,
      unit,
      station: nextStations.length === 1 ? nextStations[0].name : "",
      displayName: nextStations.length === 1 ? nextStations[0].name : "",
      classification: nextStations.length === 1 ? nextStations[0].classification : "",
    });
    setError("");
    setMode("form");
  }

  function openEdit(account) {
    setEditing(true);
    setForm({
      username: account.username,
      password: "",
      unit: account.unit,
      station: account.station,
      displayName: account.displayName,
      classification: account.classification,
      access: account.access,
    });
    setError("");
    setMode("form");
  }

  function applyResult(data) {
    if (data.removed || (data.account == null && !data.pending)) {
      setRows((current) => current.filter((row) => row.username !== (data.username || form.username)));
      return;
    }
    if (!data.account) return;
    setRows((current) => {
      const rest = current.filter((row) => row.username !== data.account.username);
      return [...rest, data.account].sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.displayName.localeCompare(b.displayName));
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/accounts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not save this account.");
        return;
      }
      applyResult(data);
      setNotice(data.pending ? "Submitted. A Super Admin must approve this before it takes effect." : "Account saved.");
      setMode("list");
    } catch {
      setError("Could not save this account.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(account) {
    const question = user?.role === "assistant-admin"
      ? `Submit ${account.username} for deletion? A Super Admin must approve it.`
      : `Delete ${account.username}?`;
    if (!window.confirm(question)) return;
    setError("");
    setNotice("");
    const response = await fetch(`/api/accounts?username=${encodeURIComponent(account.username)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not delete this account.");
      return;
    }
    if (data.pending && data.account) {
      applyResult(data);
      setNotice("Delete submitted. A Super Admin must approve it.");
      return;
    }
    setRows((current) => current.filter((row) => row.username !== account.username));
  }

  async function decide(account, decision) {
    setError("");
    setNotice("");
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: account.username, decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this request.");
      return;
    }
    if (data.removed) {
      setRows((current) => current.filter((row) => row.username !== account.username));
      return;
    }
    applyResult({ ...data, username: account.username });
  }

  const title = mode === "list" ? "Accounts" : editing ? "Edit account" : "Add account";

  return (
    <div className="dash computer-page">
      <header className="dash-head computer-head">
        <div>
          <p className="kicker">Accounts</p>
          <h1>{title}</h1>
        </div>
        {mode === "list" && manager ? (
          <button className="add-btn" type="button" onClick={openAdd}>Add</button>
        ) : null}
      </header>

      {mode === "list" ? (
        <section className="panel-card">
          {error ? <p className="error" role="alert">{error}</p> : null}
          {notice ? <p className="hint">{notice}</p> : null}
          {rows.length === 0 ? (
            <p className="hint">No accounts are loaded yet.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    {manager ? <th className="freeze">Actions</th> : null}
                    <th>Status</th>
                    <th>Office / Station</th>
                    <th>Classification</th>
                    <th>Username</th>
                    <th>Access</th>
                    <th>Office group</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((account) => (
                    <tr key={account.username}>
                      {manager ? (
                        <td className="freeze">
                          {canChange(user, account) ? (
                            <div className="row-actions">
                              <button className="row-btn" type="button" onClick={() => openEdit(account)}>Edit</button>
                              {account.username !== user.username ? (
                                <button className="row-btn danger" type="button" onClick={() => remove(account)}>Delete</button>
                              ) : null}
                              {user.role === "super-admin" && account.pendingAction ? (
                                <>
                                  <button className="row-btn" type="button" onClick={() => decide(account, "approve")}>Approve</button>
                                  <button className="row-btn danger" type="button" onClick={() => decide(account, "reject")}>Reject</button>
                                </>
                              ) : null}
                            </div>
                          ) : "—"}
                          {account.pendingAction ? <p className="pending-note">Pending Super Admin approval</p> : null}
                        </td>
                      ) : null}
                      <td>{account.pendingAction === "edit" ? `Pending · edit to ${account.pendingStation || account.station} (${account.pendingAccess || account.access})` : account.pendingAction ? `Pending · ${account.pendingAction}` : "Active"}</td>
                      <td>{account.displayName}</td>
                      <td>{account.classification}</td>
                      <td>{account.username}</td>
                      <td>{account.access}</td>
                      <td>{account.unit}</td>
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
            <div className="form-grid">
              <Field label="Region" required>
                <input value={region} disabled />
              </Field>
              <Field label="Office" required>
                <select name="unit" value={form.unit} onChange={update} required disabled={user?.role === "assistant-admin"}>
                  <option value="">--Select--</option>
                  {officeChoices.map((unit) => <option key={unit} value={unit}>{offices.includes(unit) ? officeLabel(unit) : unit}</option>)}
                </select>
              </Field>
              <Field label="Station" required>
                <select name="station" value={form.station} onChange={update} required>
                  <option value="">--Select--</option>
                  {stations.map((row) => (
                    <option key={`${row.unit}-${row.name}`} value={row.name}>{row.name} ({row.classification})</option>
                  ))}
                </select>
              </Field>
              <Field label="Classification">
                <input name="classification" value={form.classification} onChange={update} />
              </Field>
              <Field label="Username" required>
                <input name="username" value={form.username} onChange={update} required disabled={editing} autoComplete="off" />
              </Field>
              <Field label="Password" required={!editing}>
                <input name="password" type="password" value={form.password} onChange={update} required={!editing} autoComplete="new-password" placeholder={editing ? "Leave blank to keep the current password" : ""} />
              </Field>
              <Field label="Access" required>
                <select name="access" value={form.access} onChange={update} required>
                  <option value="">--Select--</option>
                  {accessOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
            </div>
          </section>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="computer-actions">
            <button className="ghost" type="button" onClick={() => { setMode("list"); setError(""); }}>Cancel</button>
            <button type="submit" disabled={busy}>
              {busy ? "Saving…" : user?.role === "assistant-admin" ? "Submit for approval" : editing ? "Update account" : "Save account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
