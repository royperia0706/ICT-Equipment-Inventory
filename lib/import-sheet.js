import * as XLSX from "xlsx";
import { keysForLabels } from "@/lib/import-columns";

export function readUpload(kind, buffer) {
  const book = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const name = book.SheetNames.find((item) => item !== "Lists") || book.SheetNames[0];
  const sheet = book.Sheets[name];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  if (!grid.length) return [];
  const labels = grid[0].map((cell) => String(cell ?? "").trim().toLowerCase());
  const headers = keysForLabels(kind, labels);
  return grid.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim() !== "")).map((row) => ({ headers, row }));
}
