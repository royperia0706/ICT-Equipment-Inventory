"use client";

import { useMemo, useState } from "react";
import { agingLabel, columnsWithAging } from "@/lib/aging";
import { cellphoneColumns } from "@/lib/cellphone-fields";
import { computerColumns, statuses } from "@/lib/computer-fields";
import { cctvColumns } from "@/lib/cctv-fields";
import { displayColumns } from "@/lib/display-fields";
import { droneColumns } from "@/lib/drone-fields";
import { internetColumns } from "@/lib/internet-fields";
import { officeLabel, officesIn, regionName, regionsIn, stationsIn } from "@/lib/location-choices";
import { navigation } from "@/lib/navigation";
import { printerColumns } from "@/lib/printer-fields";
import { radioColumns } from "@/lib/radio-fields";
import { storageColumns } from "@/lib/storage-fields";

const inventoryMenus = navigation.find((item) => item.label === "Inventory")?.children || [];

const previewColumns = ["Entry Date", "Control Number", "Inventory", "Office", "Station", "Status", "Brand", "Model", "Serial Number", "End User"];

const sheets = [
  { href: "/inventory/computer", name: "Computer", kind: "Computer", columns: columnsWithAging(computerColumns) },
  { href: "/inventory/printer", name: "Printer", kind: "Printer", columns: columnsWithAging(printerColumns) },
  { href: "/inventory/internet", name: "Internet", kind: "Internet", columns: internetColumns },
  { href: "/inventory/display-projector", name: "Display Projector", kind: "Display", columns: columnsWithAging(displayColumns) },
  { href: "/inventory/cellphone", name: "Cellphone", kind: "Cellphone", columns: columnsWithAging(cellphoneColumns) },
  { href: "/inventory/cctv", name: "CCTV", kind: "CCTV", columns: columnsWithAging(cctvColumns) },
  { href: "/inventory/drone", name: "Drone", kind: "Drone", columns: columnsWithAging(droneColumns) },
  { href: "/inventory/handheld-radio", name: "Handheld Radio", kind: "Handheld Radio", columns: columnsWithAging(radioColumns) },
  { href: "/inventory/storage", name: "Storage", kind: "Storage", columns: columnsWithAging(storageColumns) },
];

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
  if (filters.inventory) {
    const sheet = sheets.find((item) => item.href === filters.inventory);
    if (!sheet || record.kind !== sheet.kind) return false;
  }
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function endUser(row) {
  return row.specificEndUser || row.accountablePerson || row.issuedTo || row.endUser || "";
}

function previewValues(row) {
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

function fieldValue(row, key) {
  if (key === "aging") return agingLabel(row.dateAcquired);
  if (key === "province") return row.province || officeLabel(row.office || row.unit || "");
  if (key === "municipality") return row.municipality || "";
  return row[key] || "";
}

function sheetColumns(columns) {
  return columns.map(([key, label]) => {
    if (key === "province") return [key, "Office"];
    if (key === "municipality") return [key, "Station"];
    if (key === "office") return [key, "Unit"];
    return [key, label];
  });
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(rows, inventory) {
  const chosen = inventory ? sheets.filter((sheet) => sheet.href === inventory) : sheets;
  const worksheets = chosen.length ? chosen.map((sheet) => {
    const items = rows.filter((row) => row.kind === sheet.kind);
    const columns = sheetColumns(sheet.columns);
    const header = `<Row>${columns.map(([, label]) => `<Cell><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("")}</Row>`;
    const body = items.map((row) => `<Row>${columns.map(([key]) => `<Cell><Data ss:Type="String">${xmlEscape(fieldValue(row, key))}</Data></Cell>`).join("")}</Row>`).join("");
    return `<Worksheet ss:Name="${xmlEscape(sheet.name)}"><Table>${header}${body}</Table></Worksheet>`;
  }).join("") : `<Worksheet ss:Name="${xmlEscape((inventoryMenus.find((item) => item.href === inventory)?.label || "Report").replace(/[\\/?*[\]:]/g, " "))}"><Table><Row><Cell><Data ss:Type="String">No records</Data></Cell></Row></Table></Worksheet>`;
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
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
  const [inventory, setInventory] = useState("");
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
    setInventory("");
    setStatus("");
    setRows(null);
  }

  function generate() {
    setRows(records.filter((record) => matches(record, { office, station: selected, inventory, status })));
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
          Inventory
          <select value={inventory} onChange={(event) => setInventory(event.target.value)}>
            <option value="">All inventory</option>
            {inventoryMenus.map((item) => (
              <option key={item.href} value={item.href}>{item.label}</option>
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
            <div>
              <h2>{rows.length} {rows.length === 1 ? "item" : "items"}</h2>
              <p className="hint">Office: {office ? officeLabel(office) : "All Offices"} · Station: {selected ? selected.name : "All stations"}</p>
            </div>
            <button type="button" className="filter-btn" onClick={() => downloadExcel(rows, inventory)}>Download Excel</button>
          </div>
          {rows.length === 0 ? <p className="hint">No equipment matches this report.</p> : (
            <div className="computer-table-wrap">
              <table className="computer-table">
                <thead>
                  <tr>{previewColumns.map((label) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.controlNumber || row.id}>
                      {previewValues(row).map((value, index) => <td key={previewColumns[index]}>{value || "—"}</td>)}
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
