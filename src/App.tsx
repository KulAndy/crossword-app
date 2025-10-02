import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import CWG, { type CWGResult, type PositionObj } from "cwg";

interface Row {
  term: string;
  def: string;
}

type WorkbookData = {
  sheets: string[];
  workbook: XLSX.WorkBook;
};

export default function App() {
  const [bases, setBases] = useState<string[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [cwResult, setCwResult] = useState<CWGResult | null>(null);
  const [seed, setSeed] = useState<string>("123");

  useEffect(() => {
    fetch("/bases.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load /bases.json");
        return res.json() as Promise<string[]>;
      })
      .then(setBases)
      .catch((err) => {
        console.error(err);
        setBases([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedBase) {
      setWorkbookData(null);
      setRows([]);
      setSelectedSheet("");
      return;
    }
    const url = `/bases/${encodeURIComponent(selectedBase)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        const wb = XLSX.read(buffer, { type: "array" });
        setWorkbookData({ sheets: wb.SheetNames, workbook: wb });
        setSelectedSheet("");
        setRows([]);
      })
      .catch((err) => {
        console.error("Error reading workbook:", err);
        setWorkbookData(null);
      });
  }, [selectedBase]);

  useEffect(() => {
    if (!workbookData || !selectedSheet) {
      setRows([]);
      return;
    }
    const ws = workbookData.workbook.Sheets[selectedSheet];
    if (!ws) {
      setRows([]);
      return;
    }
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    const parsed: Row[] = (raw as (string | undefined)[][])
      .slice(1)
      .map((r) => ({
        term: (r[0] ?? "").toString().trim(),
        def: (r[1] ?? "").toString().trim(),
      }))
      .filter((r) => r.term.length > 0 && r.def.length > 0);
    setRows(parsed);
  }, [workbookData, selectedSheet]);

  const handleGenerate = () => {
    if (!rows || rows.length === 0) return;
    try {
      const seen = new Set<string>();
      const uniqueRows = rows.filter((r) => {
        const key = r.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const wordList = uniqueRows.map((r) => r.term.toUpperCase());
      const res = CWG(wordList);
      setCwResult(res);
    } catch (err) {
      console.error("Crossword generation failed:", err);
      setCwResult(null);
    }
  };

  const renderGrid = (): string[][] => {
    if (!cwResult) return [];
    const { width, height, positionObjArr } = cwResult;
    const grid: string[][] = Array.from({ length: height }, () =>
      Array(width).fill(""),
    );
    positionObjArr.forEach((w: PositionObj) => {
      for (let i = 0; i < w.wordStr.length; i++) {
        if (w.isHorizon) grid[w.yNum][w.xNum + i] = w.wordStr[i];
        else grid[w.yNum + i][w.xNum] = w.wordStr[i];
      }
    });
    return grid;
  };

  const grid = renderGrid();

  const wordToDef = Object.fromEntries(
    rows.map((r) => [r.term.toUpperCase(), r.def]),
  );

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>Bases / Sheets → Terms / Crossword</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <select
          value={selectedBase}
          onChange={(e) => setSelectedBase(e.target.value)}
        >
          <option value="">Select file</option>
          {bases.map((f) => (
            <option key={f} value={f}>
              {f.replace(/\.xlsx?$/i, "")}
            </option>
          ))}
        </select>
        <select
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
          disabled={!workbookData}
        >
          <option value="">Select sheet</option>
          {workbookData?.sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {rows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label>
            Seed:{" "}
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </label>
          <button onClick={handleGenerate} style={{ marginLeft: 10 }}>
            Generate Crossword
          </button>
        </div>
      )}
      {cwResult && (
        <>
          <h2>Crossword Grid</h2>
          <table
            style={{ borderCollapse: "collapse", fontFamily: "monospace" }}
          >
            <tbody>
              {grid.map((row, y) => (
                <tr key={y}>
                  {row.map((cell, x) => (
                    <td
                      key={x}
                      style={{
                        border: "1px solid #ccc",
                        width: 24,
                        height: 24,
                        textAlign: "center",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Clues</h2>
          <ul>
            {cwResult.positionObjArr.map((w, idx) => (
              <li key={idx}>
                <b>
                  ({w.isHorizon ? "across" : "down"} @ {w.xNum},{w.yNum})
                </b>{" "}
                {wordToDef[w.wordStr] || w.wordStr}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
