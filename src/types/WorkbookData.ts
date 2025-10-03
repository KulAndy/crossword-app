import * as XLSX from "xlsx";

export type WorkbookData = {
  sheets: string[];
  workbook: XLSX.WorkBook;
};
