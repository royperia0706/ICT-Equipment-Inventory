"use client";

import FocusableRow from "@/components/FocusableRow";
import { useEffect, useMemo, useRef, useState } from "react";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

const accessOptions = ["Encoder", "Assistant Admin", "Super Admin"];
const statusOptions = ["Active", "Inactive", "Deactivated"];

const emptyForm = {
  username: "",
  password: "",
  unit: "",
  station: "",
  displayName: "",
  classification: "",
  access: "",
  status: "Active",
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm9 2.7-.9-.2a7.2 7.2 0 0 0-.6-1.5l.6-.7a1 1 0 0 0-.1-1.4l-1.1-1.1a1 1 0 0 0-1.4-.1l-.7.6a7.2 7.2 0 0 0-1.5-.6L15.1 4a1 1 0 0 0-1-1h-1.6a1 1 0 0 0-1 .8l-.2.9a7.2 7.2 0 0 0-1.5.6l-.7-.6a1 1 0 0 0-1.4.1L6.6 6.9a1 1 0 0 0-.1 1.4l.6.7a7.2 7.2 0 0 0-.6 1.5l-.9.2a1 1 0 0 0-.8 1v1.6a1 1 0 0 0 .8 1l.9.2c.1.5.3 1 .6 1.5l-.6.7a1 1 0 0 0 .1 1.4l1.1 1.1a1 1 0 0 0 1.4.1l.7-.6c.5.3 1 .5 1.5.6l.2.9a1 1 0 0 0 1 .8h1.6a1 1 0 0 0 1-.8l.2-.9c.5-.1 1-.3 1.5-.6l.7.6a1 1 0 0 0 1.4-.1l1.1-1.1a1 1 0 0 0 .1-1.4l-.6-.7c.3-.5.5-1 .6-1.5l.9-.2a1 1 0 0 0 .8-1v-1.6a1 1 0 0 0-.8-1Z" />
    </svg>
  );
}

function MenuIcon({ name }) {
  const paths = {
    edit: "M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 1.1-1.1Z",
    reset: "M12 6V3L7 8l5 5V10a5 5 0 1 1-5 5H5a7 7 0 1 0 7-9Z",
    deactivate: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-6 9a6 6 0 0 1 9.5-4.8L7.2 15.5A6 6 0 0 1 6 12Zm3.5 4.8 8.3-8.3A6 6 0 0 1 9.5 16.8Z",
    show: "M12 6c-5 0-8.5 4.2-9.5 6 1 1.8 4.5 6 9.5 6s8.5-4.2 9.5-6c-1-1.8-4.5-6-9.5-6Zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
    approve: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
    reject: "M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={paths[name]} />
    </svg>
  );
}

function AccountMenu({ account, user, busy, onEdit, onReset, onDeactivate, onShow, onDecide }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const allowed = canChange(user, account);

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const rect = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setPlace({
      right: Math.max(8, window.innerWidth - rect.right),
      top: below < 220 ? rect.top - 8 : rect.bottom + 6,
      upward: below < 220,
    });
    setOpen((current) => !current);
  }

  if (!allowed) return "—";

  return (
    <div className="account-action">
      <button ref={buttonRef} className="action-btn" type="button" onClick={toggle} disabled={busy}>
        <GearIcon />
        Action
        <span className="action-caret" aria-hidden="true" />
      </button>
      {open && place ? (
        <div
          ref={menuRef}
          className="action-menu"
          style={{
            right: place.right,
            top: place.upward ? "auto" : place.top,
            bottom: place.upward ? window.innerHeight - place.top : "auto",
          }}
        >
          {user.role === "assistant-admin" ? (
            <>
              <button type="button" onClick={() => { setOpen(false); onReset(account); }}><MenuIcon name="reset" />Reset</button>
              <button type="button" onClick={() => { setOpen(false); onEdit(account); }}><MenuIcon name="edit" />Edit</button>
              <button type="button" onClick={() => { setOpen(false); onDeactivate(account); }}><MenuIcon name="deactivate" />Deactivate</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setOpen(false); onEdit(account); }}><MenuIcon name="edit" />Edit</button>
              <button type="button" onClick={() => { setOpen(false); onReset(account); }}><MenuIcon name="reset" />Reset Password</button>
              <button type="button" onClick={() => { setOpen(false); onDeactivate(account); }}><MenuIcon name="deactivate" />Deactivate</button>
              {user.role === "super-admin" ? (
                <button type="button" onClick={() => { setOpen(false); onShow(account); }}><MenuIcon name="show" />Show Password</button>
              ) : null}
            </>
          )}
          {user.role === "super-admin" && account.pendingAction ? (
            <>
              <button type="button" onClick={() => { setOpen(false); onDecide(account, "approve"); }}><MenuIcon name="approve" />Approve</button>
              <button type="button" onClick={() => { setOpen(false); onDecide(account, "reject"); }}><MenuIcon name="reject" />Reject</button>
            </>
          ) : null}
        </div>
      ) : null}
      {account.pendingAction ? <p className="pending-note">On hold until a Super Admin approves</p> : null}
    </div>
  );
}

function canChange(user, account) {
  if (!canManage(user) || !account) return false;
  if (account.role === "super-admin" && user.role !== "super-admin") return false;
  if (user.role === "assistant-admin" && (account.unit !== user.unit || account.role !== "encoder")) return false;
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
  const [issued, setIssued] = useState(null);
  const [shown, setShown] = useState(null);
  const [filters, setFilters] = useState({ unit: "", classification: "", station: "" });
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
  const choices = user?.role === "assistant-admin" ? ["Encoder"] : accessOptions;
  const filterOffices = useMemo(
    () => [...new Set(rows.map((account) => account.unit).filter(Boolean))].sort((a, b) => officeLabel(a).localeCompare(officeLabel(b))),
    [rows],
  );
  const filterClassifications = useMemo(
    () => [...new Set(rows
      .filter((account) => !filters.unit || account.unit === filters.unit)
      .map((account) => account.classification)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [rows, filters.unit],
  );
  const filterStations = useMemo(
    () => [...new Set(rows
      .filter((account) => !filters.unit || account.unit === filters.unit)
      .filter((account) => !filters.classification || account.classification === filters.classification)
      .map((account) => account.station || account.displayName)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [rows, filters.unit, filters.classification],
  );
  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((account) => {
      const matchesFilters = (
        (!filters.unit || account.unit === filters.unit)
        && (!filters.classification || account.classification === filters.classification)
        && (!filters.station || (account.station || account.displayName) === filters.station)
      );
      if (!matchesFilters || !query) return matchesFilters;
      const searchable = [
        account.username,
        account.displayName,
        account.station,
        account.classification,
        account.unit,
        officeLabel(account.unit),
        account.province,
        account.access,
        statusText(account),
      ].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [rows, filters, searchTerm]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => {
      if (name === "unit") return { unit: value, classification: "", station: "" };
      if (name === "classification") return { ...current, classification: value, station: "" };
      return { ...current, [name]: value };
    });
  }

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
      status: account.status || (account.blocked ? "Deactivated" : "Active"),
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
      setNotice(data.pending ? "On hold. A Super Admin must approve this before it takes effect." : "Account saved.");
      setMode("list");
    } catch {
      setError("Could not save this account.");
    } finally {
      setBusy(false);
    }
  }

  function statusText(account) {
    if (account.blocked) return "Deactivated";
    return statusOptions.includes(account.status) ? account.status : "Active";
  }

  async function accountAction(account, action) {
    setError("");
    setNotice("");
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: account.username, action }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not update this account.");
      return null;
    }
    if (data.account) applyResult(data);
    return data;
  }

  async function resetPassword(account) {
    const hold = user?.role === "assistant-admin";
    const question = hold
      ? `Submit a password reset for ${account.username}? It stays on hold until a Super Admin approves it.`
      : `Reset the password for ${account.username}?`;
    if (!window.confirm(question)) return;
    setIssued(null);
    const data = await accountAction(account, "reset-password");
    if (!data) return;
    if (data.pending) {
      setNotice("On hold. A Super Admin must approve the password reset.");
      return;
    }
    setIssued({ username: account.username, password: data.temporaryPassword });
    setNotice("Password reset. They must set a new password at the next sign-in.");
  }

  async function deactivate(account) {
    const hold = user?.role === "assistant-admin";
    const question = hold
      ? `Submit deactivation for ${account.username}? It stays on hold until a Super Admin approves it.`
      : `Deactivate ${account.username}? They will not be able to sign in.`;
    if (!window.confirm(question)) return;
    const data = await accountAction(account, "deactivate");
    if (!data) return;
    setNotice(data.pending ? "On hold. A Super Admin must approve the deactivation." : "Account deactivated.");
  }

  async function showPassword(account) {
    const data = await accountAction(account, "show-password");
    if (!data) return;
    setShown({ username: data.username || account.username, password: data.password || "" });
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
    setNotice(decision === "approve" ? "Approved." : "Rejected.");
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
          {issued ? (
            <p className="banner" role="status">
              Password for {issued.username}: <strong>{issued.password}</strong>. They must set a new password at the next sign-in.
            </p>
          ) : null}
          <div className="dash-filters account-filters">
            <label>
              Office
              <select name="unit" value={filters.unit} onChange={updateFilter}>
                <option value="">All Offices</option>
                {filterOffices.map((unit) => <option key={unit} value={unit}>{officeLabel(unit)}</option>)}
              </select>
            </label>
            <label>
              Classification
              <select name="classification" value={filters.classification} onChange={updateFilter}>
                <option value="">All Classifications</option>
                {filterClassifications.map((classification) => <option key={classification} value={classification}>{classification}</option>)}
              </select>
            </label>
            <label>
              Station
              <select name="station" value={filters.station} onChange={updateFilter}>
                <option value="">All Stations</option>
                {filterStations.map((station) => <option key={station} value={station}>{station}</option>)}
              </select>
            </label>
            <button
              className="ghost filter-btn"
              type="button"
              onClick={() => {
                setFilters({ unit: "", classification: "", station: "" });
                setSearchInput("");
                setSearchTerm("");
              }}
            >
              Clear
            </button>
          </div>
          <form
            className="account-search"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
            }}
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search username, office, station, classification, or access"
              aria-label="Search accounts"
            />
            <button type="submit">Search</button>
          </form>
          {rows.length === 0 ? (
            <p className="hint">No accounts are loaded yet.</p>
          ) : filteredRows.length === 0 ? (
            <p className="hint">No accounts match the selected filters.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Office</th>
                    <th>Station</th>
                    <th>Classification</th>
                    <th>Username</th>
                    <th>Access</th>
                    {manager ? <th className="action-col">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((account) => (
                    <FocusableRow key={account.username} focusKey={account.username}>
                      <td>{statusText(account)}</td>
                      <td>{officeLabel(account.unit) || account.province || account.unit}</td>
                      <td>{account.station || account.displayName}</td>
                      <td>{account.classification}</td>
                      <td>{account.username}</td>
                      <td>{account.access}</td>
                      {manager ? (
                        <td className="action-col">
                          <AccountMenu
                            account={account}
                            user={user}
                            busy={busy}
                            onEdit={openEdit}
                            onReset={resetPassword}
                            onDeactivate={deactivate}
                            onShow={showPassword}
                            onDecide={decide}
                          />
                        </td>
                      ) : null}
                    </FocusableRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shown ? (
            <div className="modal-back" role="presentation" onClick={() => setShown(null)}>
              <div className="modal-card prompt-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <p>
                  {shown.password
                    ? <>Password for {shown.username}: <strong>{shown.password}</strong></>
                    : <>The password for {shown.username} is hidden. Use Reset Password to issue a new one.</>}
                </p>
                <button type="button" onClick={() => setShown(null)}>Ok</button>
              </div>
            </div>
          ) : null}
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
                  {choices.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Status" required>
                <select name="status" value={form.status} onChange={update} required>
                  {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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
