"use client";

import { useMemo, useState } from "react";
import { statuses } from "@/lib/computer-fields";
import { officeLabel, officesIn, regionName, regionsIn, stationsIn } from "@/lib/location-choices";
import { navigation } from "@/lib/navigation";

const inventoryMenus = navigation.find((item) => item.label === "Inventory")?.children || [];

export default function OfficeStationFilters({ locations = [], user, onFilter }) {
  const lockOffice = user?.role === "assistant-admin" || user?.role === "encoder";
  const lockStation = user?.role === "encoder";
  const region = useMemo(() => regionsIn(locations)[0] || regionName, [locations]);
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const [office, setOffice] = useState(lockOffice ? (user?.unit || "") : "");
  const [stationId, setStationId] = useState("");
  const [inventory, setInventory] = useState("");
  const [status, setStatus] = useState("");
  const stations = useMemo(() => {
    const pool = !office
      ? locations.filter((row) => (row.region || regionName) === region)
      : stationsIn(locations, office);
    if (lockStation) return pool.filter((row) => row.name === user?.station);
    return pool;
  }, [locations, office, region, lockStation, user?.station]);
  const activeStation = stations.length === 1 ? `${stations[0].unit}-${stations[0].name}` : stationId;
  const selected = stations.find((row) => `${row.unit}-${row.name}` === activeStation) || null;

  return (
    <section className="panel-card dash-filters">
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
      <button type="button" className="filter-btn" onClick={() => onFilter?.({ office, station: selected, inventory, status })}>Filter</button>
      <p className="filter-note">
        {selected
          ? `${officeLabel(selected.unit)} · ${selected.name} · ${selected.classification}`
          : office
            ? `${stations.length} stations under ${officeLabel(office)}`
            : `${stations.length} stations under all offices`}
      </p>
    </section>
  );
}
