import { conditionsByStatus } from "@/lib/computer-fields";
import { templateFields } from "@/lib/import-columns";
import { listColumns, officeChoices, rangeName, stationsByOffice } from "@/lib/template-lists";

const dataRows = 150;

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validation(column, formula) {
  return `<DataValidation xmlns="urn:schemas-microsoft-com:office:excel"><Range>R2C${column}:R${dataRows + 1}C${column}</Range><Type>List</Type><Value>${formula}</Value></DataValidation>`;
}

export function templateXml(kind, locations) {
  const fields = templateFields(kind);
  const { title, indexes, unique } = listColumns(kind, locations);
  const offices = officeChoices(locations);
  const stationGroups = stationsByOffice(locations);
  const conditionGroups = Object.entries(conditionsByStatus).filter(([, options]) => options.length);

  const blocks = [
    offices,
    ...stationGroups.map((group) => group.stations),
    ...conditionGroups.map(([, options]) => options),
    ...unique.map((item) => item.options),
  ];
  const height = blocks.reduce((max, options) => Math.max(max, options.length), 0);
  const listRows = [];
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const cells = blocks.map((options, columnIndex) => {
      const value = options[rowIndex];
      if (value === undefined) return "";
      return `<Cell ss:Index="${columnIndex + 1}"><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
    }).join("");
    if (cells) listRows.push(`<Row>${cells}</Row>`);
  }

  const names = [];
  stationGroups.forEach((group, index) => {
    const column = index + 2;
    const last = Math.max(group.stations.length, 1);
    names.push(`<NamedRange ss:Name="${xmlEscape(rangeName(group.office))}" ss:RefersTo="=Lists!R1C${column}:R${last}C${column}"/>`);
  });
  conditionGroups.forEach(([status, options], index) => {
    const column = 1 + stationGroups.length + 1 + index;
    names.push(`<NamedRange ss:Name="${xmlEscape(rangeName(status))}" ss:RefersTo="=Lists!R1C${column}:R${options.length}C${column}"/>`);
  });

  const header = `<Row>${fields.map(([, label]) => `<Cell><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>`).join("")}</Row>`;
  const officeColumn = fields.findIndex(([key]) => key === "province") + 1;
  const stationColumn = fields.findIndex(([key]) => key === "municipality") + 1;
  const statusColumn = fields.findIndex(([key]) => key === "status") + 1;
  const conditionColumn = fields.findIndex(([key]) => key === "condition") + 1;
  const staticStart = 1 + stationGroups.length + conditionGroups.length;
  const validations = [];
  if (officeColumn > 0 && offices.length) {
    validations.push(validation(officeColumn, `=Lists!R1C1:R${offices.length}C1`));
  }
  if (stationColumn > 0 && officeColumn > 0) {
    validations.push(validation(stationColumn, `=INDIRECT(SUBSTITUTE(RC[${officeColumn - stationColumn}],&quot; &quot;,&quot;_&quot;))`));
  }
  if (conditionColumn > 0 && statusColumn > 0) {
    validations.push(validation(conditionColumn, `=INDIRECT(SUBSTITUTE(RC[${statusColumn - conditionColumn}],&quot; &quot;,&quot;_&quot;))`));
  }
  indexes.forEach((listIndex, columnIndex) => {
    if (listIndex < 0) return;
    const column = staticStart + listIndex + 1;
    const last = unique[listIndex].options.length;
    validations.push(validation(columnIndex + 1, `=Lists!R1C${column}:R${last}C${column}`));
  });

  const listsSheet = blocks.some((options) => options.length)
    ? `<Worksheet ss:Name="Lists"><Table>${listRows.join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Visible>SheetHidden</Visible></WorksheetOptions></Worksheet>`
    : "";
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Names>${names.join("")}</Names>
<Worksheet ss:Name="${xmlEscape(title)}"><Table>${header}</Table>${validations.join("")}</Worksheet>
${listsSheet}
</Workbook>`;
}
