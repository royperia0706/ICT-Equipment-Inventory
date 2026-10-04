"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import OfficeStationFilters from "@/components/OfficeStationFilters";
import { officeLabel } from "@/lib/location-choices";
import { activities, attention, provinces, summarize, totals } from "@/lib/dashboard";

const inventoryKind = {
  "/inventory/computer": "Computer",
  "/inventory/printer": "Printer",
  "/inventory/internet": "Internet",
  "/inventory/router": "Router",
  "/inventory/switch": "Switch",
  "/inventory/display-projector": "Display",
  "/inventory/cellphone": "Cellphone",
  "/inventory/handheld-radio": "Handheld Radio",
  "/inventory/storage": "Storage",
};

function matchesFilters(record, filters) {
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
  if (filters.inventory && record.kind !== inventoryKind[filters.inventory]) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function number(value) {
  return value.toLocaleString("en-US");
}

const pieColors = ["#4C8BF5", "#F5A142", "#C8CCD2", "#F6C445", "#7EB6FF", "#E8D48B", "#8E97A3"];
const ringRadius = 70;
const ringLength = 2 * Math.PI * ringRadius;

function pieSlices(rows) {
  const usable = rows.filter((row) => row.value > 0);
  const total = usable.reduce((sum, row) => sum + row.value, 0);
  const gap = usable.length > 1 ? 3 : 0;
  let offset = 0;
  return usable.map((row, index) => {
    const length = Math.max((row.value / total) * ringLength - gap, 1);
    const slice = {
      ...row,
      color: pieColors[index % pieColors.length],
      dasharray: `${length} ${ringLength}`,
      dashoffset: -offset,
    };
    offset += length + gap;
    return slice;
  });
}

function Pie({ rows, label }) {
  const slices = pieSlices(rows);
  if (!slices.length) {
    return (
      <ul className="pie-legend">
        {(rows.length ? rows : [{ label: "No equipment yet", value: 0 }]).map((row) => (
          <li key={row.label}>
            <i style={{ background: "#C8CCD2" }} />
            <span>{row.label}</span>
            <strong>{number(row.value)}</strong>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="pie-block">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label={label}>
        <g transform="rotate(-90 100 100)">
          {slices.map((slice) => (
            <circle
              key={slice.label}
              cx="100"
              cy="100"
              r={ringRadius}
              fill="none"
              stroke={slice.color}
              strokeWidth="26"
              strokeLinecap="butt"
              strokeDasharray={slice.dasharray}
              strokeDashoffset={slice.dashoffset}
            >
              <title>{`${slice.label}: ${number(slice.value)}`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <ul className="pie-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{number(slice.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard({ kicker = "Dashboard", title = "Inventory overview", locations = [], records = [], summary }) {
  const [applied, setApplied] = useState(null);
  const onFilter = useCallback((next) => setApplied(next), []);
  const filteredRecords = useMemo(
    () => (applied ? records.filter((record) => matchesFilters(record, applied)) : records),
    [records, applied],
  );
  const stationGroups = useMemo(() => {
    if (!applied) return [];
    const groups = new Map();
    for (const record of filteredRecords) {
      const station = record.municipality || "Unassigned";
      const office = record.province || officeLabel(record.office || record.unit || "");
      const key = `${office}|${station}`;
      if (!groups.has(key)) groups.set(key, { office, station, items: [] });
      groups.get(key).items.push(record);
    }
    if (applied.station && groups.size === 0) {
      groups.set("selected", {
        office: officeLabel(applied.station.unit),
        station: applied.station.name,
        items: [],
      });
    }
    return [...groups.values()].sort((a, b) => a.office.localeCompare(b.office) || a.station.localeCompare(b.station));
  }, [applied, filteredRecords]);
  const view = useMemo(() => {
    if (!records.length && summary && !applied) return summary;
    return summarize(filteredRecords, locations);
  }, [records, summary, applied, filteredRecords, locations]);
  const cards = view?.totals || totals;
  const statusRows = cards.filter((item) => item.label !== "Total equipment");
  const provinceRows = view?.provinces || provinces;
  const attentionRows = view?.attention || attention;
  const activityRows = view?.activities || activities;

  return (
    <div className="dash">
      <header className="dash-head">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
      </header>

      <OfficeStationFilters locations={locations} onFilter={onFilter} />

      {applied ? (
        <section className="panel-card filter-results">
          <h2>Filtered stations and items</h2>
          {stationGroups.length === 0 ? (
            <p className="filter-empty">No stations or items match this filter.</p>
          ) : (
            <div className="computer-table-wrap">
              <table className="computer-table filter-table">
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Office</th>
                    <th>Control Number</th>
                    <th>Inventory</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stationGroups.map((group) => (
                    group.items.length ? group.items.map((item) => (
                      <tr key={item.controlNumber || `${group.station}-${item.kind}`}>
                        <td>{group.station}</td>
                        <td>{group.office}</td>
                        <td>{item.controlNumber || "—"}</td>
                        <td>{item.kind === "Display" ? "Display/Projector" : (item.kind || "—")}</td>
                        <td>{item.status || "—"}</td>
                      </tr>
                    )) : (
                      <tr key={`${group.office}-${group.station}`}>
                        <td>{group.station}</td>
                        <td>{group.office}</td>
                        <td colSpan="3">No items</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="stat-grid" aria-label="Equipment totals">
        {cards.map((item) => (
          <article key={item.label} className={`stat tone-${item.tone}`}>
            <p>{item.label}</p>
            <strong>{number(item.value)}</strong>
          </article>
        ))}
      </section>

      <section className="split">
        <article className="panel-card">
          <h2>Equipment by status</h2>
          <Pie rows={statusRows} label="Equipment by status" />
        </article>
        <article className="panel-card">
          <h2>Equipment by province</h2>
          <Pie rows={provinceRows} label="Equipment by province" />
          <Link className="text-link" href="/inventory/locations">View by location</Link>
        </article>
      </section>

      <section className="panel-card">
        <h2>Needs attention</h2>
        <ul className="attention">
          {attentionRows.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{number(item.count)}</strong>
              <Link href={item.href}>View</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-card">
        <h2>Recent activities</h2>
        <ul className="activity">
          {activityRows.length === 0 ? <li><span>No recent activity.</span></li> : activityRows.map((item) => (
            <li key={item.time + item.label}>
              <time>{item.time}</time>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
