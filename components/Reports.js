"use client";

import { useMemo, useState } from "react";
import { statuses } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionName, regionsIn, stationsIn } from "@/lib/location-choices";

const reportColumns = ["Entry Date", "Control Number", "Inventory", "Office", "Station", "Status", "Brand", "Model", "Serial Number", "End User"];

function matches(record, filters) {
  if (filters.office) {
    const label = officeLabel(filters.office);
    const officeHit = record.office === filters.office || record.unit === filters.office || record.province === label;
    if (!officeHit) return false;
  }
  if (filters.station) {
    if (record.municipality !== filters.station.name) return false;
    const stationOffice = filters.station.unit;
    const sameOffice = record.office === stationOffice || record.unit === stationOffice || record.province === officeLabel(stationOffice);
    if (!sameOffice) return false;
  }
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function endUser(row) {
  return row.specificEndUser || row.accountablePerson || row.issuedTo || "";
}

function reportValues(row) {
  return [
    row.entryDate || "",
    row.controlNumber || row.id || "",
    row.kind || "",
    row.province || officeLabel(row.office || row.unit || ""),
    row.municipality || "",
    row.status || "",
    row.brand || row.provider || "",
    row.model || "",
    row.serialNumber || "",
    endUser(row),
  ];
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(rows) {
  const header = `<Row>${reportColumns.map((label) => `<Cell><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${reportValues(row).map((value) => `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Report"><Table>${header}${body}</Table></Worksheet>
</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory-report.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ locations = [], records = [], user }) {
  const lockOffice = user?.role === "assistant-admin" || user?.role === "encoder";
  const lockStation = user?.role === "encoder";
  const region = useMemo(() => regionsIn(locations)[0] || regionName, [locations]);
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const [office, setOffice] = useState(lockOffice ? (user?.unit || "") : "");
  const [stationId, setStationId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState(null);
  const stations = useMemo(() => {
    const pool = !office
      ? locations.filter((row) => (row.region || regionName) === region)
      : stationsIn(locations, office);
    if (lockStation) return pool.filter((row) => row.name === user?.station);
    return pool;
  }, [locations, office, region, lockStation, user?.station]);
  const activeStation = stations.length === 1 ? `${stations[0].unit}-${stations[0].name}` : stationId;
  const selected = stations.find((row) => `${row.unit}-${row.name}` === activeStation) || null;

  function clear() {
    setOffice(lockOffice ? (user?.unit || "") : "");
    setStationId("");
    setStatus("");
    setRows(null);
  }

  function generate() {
    setRows(records.filter((record) => matches(record, { office, station: selected, status })));
  }

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <p className="kicker">Reports</p>
          <h1>Inventory report</h1>
        </div>
      </header>
      <section className="panel-card dash-filters report-filters">
        <label>
          Office
          <select
            value={office}
            disabled={lockOffice || !offices.length}
            onChange={(event) => {
              setOffice(event.target.value);
              setStationId("");
            }}
          >
            {lockOffice ? null : <option value="">All Offices</option>}
            {offices.map((unit) => (
              <option key={unit} value={unit}>{officeLabel(unit)}</option>
            ))}
          </select>
        </label>
        <label>
          Station
          <select value={activeStation} disabled={lockStation || stations.length <= 1} onChange={(event) => setStationId(event.target.value)}>
            {lockStation || stations.length <= 1 ? null : <option value="">All stations</option>}
            {stations.map((row) => (
              <option key={`${row.unit}-${row.name}`} value={`${row.unit}-${row.name}`}>
                {row.name} ({row.classification})
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button type="button" className="filter-btn ghost" onClick={clear}>Clear</button>
          <button type="button" className="filter-btn" onClick={generate}>Generate</button>
        </div>
      </section>
      {rows ? (
        <section className="panel-card filter-results">
          <div className="report-head">
            <h2>{rows.length} {rows.length === 1 ? "item" : "items"}</h2>
            <button type="button" className="filter-btn" onClick={() => downloadExcel(rows)}>Download Excel</button>
          </div>
          {rows.length === 0 ? <p className="hint">No equipment matches this report.</p> : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>{reportColumns.map((label) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.controlNumber || row.id}>
                      {reportValues(row).map((value, index) => <td key={reportColumns[index]}>{value || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
