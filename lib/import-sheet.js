import * as XLSX from "xlsx";
import { headerMap } from "@/lib/import-columns";

export function readUpload(kind, buffer) {
  const book = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  if (!grid.length) return [];
  const labels = grid[0].map((cell) => String(cell ?? "").trim().toLowerCase());
  const map = headerMap(kind);
  const headers = labels.map((label) => map.get(label) || "");
  return grid.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== "")).map((row) => ({ headers, row }));
}
