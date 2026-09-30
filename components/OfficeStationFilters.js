"use client";

import { useMemo, useState } from "react";
import { officeOrder } from "@/lib/location-choices";

export default function OfficeStationFilters({ locations = [] }) {
  const offices = useMemo(() => {
    const present = new Set(locations.map((row) => row.unit));
    return officeOrder.filter((unit) => present.has(unit));
  }, [locations]);
  const [office, setOffice] = useState(offices[0] || "");
  const [stationId, setStationId] = useState("");

  const stations = useMemo(
    () => locations.filter((row) => row.unit === office),
    [locations, office]
  );
  const selected = stations.find((row) => `${row.unit}-${row.name}` === stationId) || null;

  return (
    <section className="panel-card dash-filters">
      <label>
        Office
        <select
          value={office}
          onChange={(event) => {
            setOffice(event.target.value);
            setStationId("");
          }}
        >
          {offices.map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </label>
      <label>
        Station
        <select value={stationId} onChange={(event) => setStationId(event.target.value)}>
          <option value="">All stations</option>
          {stations.map((row) => (
            <option key={`${row.unit}-${row.name}`} value={`${row.unit}-${row.name}`}>
              {row.name} ({row.classification})
            </option>
          ))}
        </select>
      </label>
      <p className="filter-note">
        {selected
          ? `${selected.name} · classification ${selected.classification}`
          : `${stations.length} stations in ${office || "this office"}`}
      </p>
    </section>
  );
}
