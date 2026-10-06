export function entryDateStamp(time = Date.now()) {
  const date = new Date(Number(time) || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function withEntryDate(row) {
  if (!row) return row;
  return { ...row, entryDate: row.entryDate || entryDateStamp(row.createdAt) || "" };
}

export function preserveEntryDate(current) {
  if (current?.entryDate) return current.entryDate;
  return entryDateStamp(current?.createdAt);
}
