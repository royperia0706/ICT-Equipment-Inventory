"use client";

import { useMemo, useState } from "react";
import { statuses } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionName, regionsIn, stationsIn } from "@/lib/location-choices";
import { navigation } from "@/lib/navigation";

const inventoryMenus = navigation.find((item) => item.label === "Inventory")?.children || [];

export default function OfficeStationFilters({ locations = [], onFilter }) {
  const region = useMemo(() => regionsIn(locations)[0] || regionName, [locations]);
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const [office, setOffice] = useState("");
  const [stationId, setStationId] = useState("");
  const [inventory, setInventory] = useState("");
  const [status, setStatus] = useState("");
  const stations = useMemo(() => {
    if (!office) return locations.filter((row) => (row.region || regionName) === region);
    return stationsIn(locations, office);
  }, [locations, office, region]);
  const activeStation = stations.length === 1 ? `${stations[0].unit}-${stations[0].name}` : stationId;
  const selected = stations.find((row) => `${row.unit}-${row.name}` === activeStation) || null;

  return (
    <section className="panel-card dash-filters">
      <label>
        Office
        <select
          value={office}
          disabled={!offices.length}
          onChange={(event) => {
            setOffice(event.target.value);
            setStationId("");
          }}
        >
          <option value="">All Offices</option>
          {offices.map((unit) => (
            <option key={unit} value={unit}>{officeLabel(unit)}</option>
          ))}
        </select>
      </label>
      <label>
        Station
        <select value={activeStation} disabled={stations.length <= 1} onChange={(event) => setStationId(event.target.value)}>
          {stations.length > 1 ? <option value="">All stations</option> : null}
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
        <p className="filter-note">
          {selected
            ? `${officeLabel(selected.unit)} · ${selected.name} · ${selected.classification}`
            : office
              ? `${stations.length} stations under ${officeLabel(office)}`
              : `${stations.length} stations under all offices`}
        </p>
        <button type="button" onClick={() => onFilter?.({ office, station: selected, inventory, status })}>Filter</button>
      </div>
    </section>
  );
}
