import type { WorkbookData } from "../types/WorkbookData";

interface FileSelectorProperties {
  bases: string[];
  onSelectBase: (base: string) => void;
  onSelectSheet: (sheet: string) => void;
  selectedBase: string;
  selectedSheet: string;
  workbookData: null | WorkbookData;
}

export const FileSelector = ({
  bases,
  onSelectBase,
  onSelectSheet,
  selectedBase,
  selectedSheet,
  workbookData,
}: FileSelectorProperties) => {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
      <select
        onChange={(event) => onSelectBase(event.target.value)}
        value={selectedBase}
      >
        <option value="">Select file</option>
        {bases.map((f) => (
          <option key={f} value={f}>
            {f.replace(/\.xlsx?$/i, "")}
          </option>
        ))}
      </select>
      <select
        disabled={!workbookData}
        onChange={(event) => onSelectSheet(event.target.value)}
        value={selectedSheet}
      >
        <option value="">Select sheet</option>
        {workbookData?.sheets.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
};
