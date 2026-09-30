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

export function locationChoices(rows, province) {
  const group = rows.filter((row) => row.province === province);
  const stations = group.filter((row) => row.category !== "office").map((row) => row.name);
  const offices = group.filter((row) => row.category === "office").map((row) => row.name);
  const names = group.map((row) => row.name);
  return {
    stations: stations.length ? stations : names,
    offices: offices.length ? offices : names,
  };
}
