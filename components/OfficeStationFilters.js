"use client";

import { useMemo, useState } from "react";
import { officeLabel, officesIn, regionsIn, stationsIn } from "@/lib/location-choices";

export default function OfficeStationFilters({ locations = [] }) {
  const regions = useMemo(() => regionsIn(locations), [locations]);
  const [region, setRegion] = useState(regions[0] || "");
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const [office, setOffice] = useState(offices[0] || "");
  const [stationId, setStationId] = useState("");
  const stations = useMemo(() => stationsIn(locations, office), [locations, office]);
  const selected = stations.find((row) => `${row.unit}-${row.name}` === stationId) || null;

  return (
    <section className="panel-card dash-filters">
      <label>
        Region
        <select
          value={region}
          onChange={(event) => {
            const nextRegion = event.target.value;
            const nextOffices = officesIn(locations, nextRegion);
            setRegion(nextRegion);
            setOffice(nextOffices[0] || "");
            setStationId("");
          }}
        >
          {regions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
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
            <option key={unit} value={unit}>{officeLabel(unit)}</option>
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
          ? `${officeLabel(office)} · ${selected.name} · ${selected.classification}`
          : `${stations.length} stations under ${officeLabel(office) || "this office"}`}
      </p>
    </section>
  );
}
