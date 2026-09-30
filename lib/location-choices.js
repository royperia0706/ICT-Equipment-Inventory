export const officeOrder = [
  "REGIONAL HEADQUARTERS",
  "CAVITE PPO",
  "LAGUNA PPO",
  "BATANGAS PPO",
  "RIZAL PPO",
  "QUEZON PPO",
  "RMFB",
];

export const provinceOrder = [
  "Regional Headquarters",
  "Cavite",
  "Laguna",
  "Batangas",
  "Rizal",
  "Quezon",
  "RMFB",
];

export function provinceName(unit) {
  if (unit === "REGIONAL HEADQUARTERS") return "Regional Headquarters";
  if (unit === "RMFB") return "RMFB";
  const bare = String(unit || "").replace(/ PPO$/i, "").trim();
  return bare.charAt(0) + bare.slice(1).toLowerCase();
}

export const regionName = "PRO 4A - CALABARZON";

export function officeLabel(unit) {
  if (unit === "REGIONAL HEADQUARTERS") return "Regional Headquarters";
  if (unit === "RMFB") return "RMFB";
  return provinceName(unit);
}

export function regionsIn(locations) {
  const names = [...new Set(locations.map((row) => row.region || regionName))];
  return names.length ? names : [regionName];
}

export function officesIn(locations, region) {
  const rows = locations.filter((row) => (row.region || regionName) === region);
  const present = new Set(rows.map((row) => row.unit));
  return officeOrder.filter((unit) => present.has(unit));
}

export function stationsIn(locations, unit) {
  return locations.filter((row) => row.unit === unit);
}

