export function agingLabel(dateAcquired, today = new Date()) {
  const start = new Date(`${dateAcquired || ""}T00:00:00`);
  if (!dateAcquired || Number.isNaN(start.getTime())) return "—";
  let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  if (today.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "0 days";
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (remaining) parts.push(`${remaining} month${remaining === 1 ? "" : "s"}`);
  if (parts.length) return parts.join(", ");
  const days = Math.max(0, Math.round((today - start) / 86400000));
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function columnsWithAging(columns) {
  const next = [];
  for (const column of columns) {
    next.push(column);
    if (column[0] === "dateAcquired") next.push(["aging", "Aging"]);
  }
  return next;
}
