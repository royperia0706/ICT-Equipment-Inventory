import { templateColumns } from "@/lib/import-columns";
import { listColumns } from "@/lib/template-lists";

const dataRows = 150;

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function templateXml(kind, locations) {
  const columns = templateColumns(kind);
  const { title, indexes, unique } = listColumns(kind, locations);
  const header = `<Row>${columns.map(([, label]) => `<Cell><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("")}</Row>`;
  const validations = indexes.map((listIndex, columnIndex) => {
    if (listIndex < 0) return "";
    const height = unique[listIndex].options.length;
    return `<DataValidation xmlns="urn:schemas-microsoft-com:office:excel"><Range>R2C${columnIndex + 1}:R${dataRows + 1}C${columnIndex + 1}</Range><Type>List</Type><CellRangeList/><Value>Lists!R1C${listIndex + 1}:R${height}C${listIndex + 1}</Value></DataValidation>`;
  }).join("");
  const height = unique.reduce((max, item) => Math.max(max, item.options.length), 0);
  const listRows = [];
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const cells = unique.map((item, columnIndex) => {
      const value = item.options[rowIndex];
      if (value === undefined) return "";
      return `<Cell ss:Index="${columnIndex + 1}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
    }).join("");
    if (cells) listRows.push(`<Row>${cells}</Row>`);
  }
  const listsSheet = unique.length
    ? `<Worksheet ss:Name="Lists"><Table>${listRows.join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Visible>SheetHidden</Visible></WorksheetOptions></Worksheet>`
    : "";
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xmlEscape(title)}"><Table>${header}</Table>${validations}</Worksheet>
${listsSheet}
</Workbook>`;
}
