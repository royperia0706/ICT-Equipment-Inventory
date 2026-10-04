"use client";

import { useMemo, useState } from "react";
import { officeLabel, officesIn, regionName, regionsIn, stationsIn } from "@/lib/location-choices";

export default function OfficeStationFilters({ locations = [] }) {
  const regions = useMemo(() => regionsIn(locations), [locations]);
  const [region, setRegion] = useState(regions[0] || "");
  const offices = useMemo(() => officesIn(locations, region), [locations, region]);
  const [office, setOffice] = useState("");
  const [stationId, setStationId] = useState("");
  const stations = useMemo(() => {
    if (!office) return locations.filter((row) => (row.region || regionName) === region);
    return stationsIn(locations, office);
  }, [locations, office, region]);
  const activeStation = stations.length === 1 ? `${stations[0].unit}-${stations[0].name}` : stationId;
  const selected = stations.find((row) => `${row.unit}-${row.name}` === activeStation) || null;

  return (
    <section className="panel-card dash-filters">
      <label>
        Region
        <select
          value={region}
          disabled={regions.length <= 1}
          onChange={(event) => {
            const nextRegion = event.target.value;
            setRegion(nextRegion);
            setOffice("");
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
      <p className="filter-note">
        {selected
          ? `${officeLabel(office)} · ${selected.name} · ${selected.classification}`
          : office
            ? `${stations.length} stations under ${officeLabel(office)}`
            : `${stations.length} stations under all offices`}
      </p>
    </section>
  );
}
