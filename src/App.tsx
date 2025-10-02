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
  const [userGrid, setUserGrid] = useState<string[][]>([]);

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
      setUserGrid(
        Array(res.height)
          .fill("")
          .map(() => Array(res.width).fill("")),
      );
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

  const handleInputChange = (y: number, x: number, value: string) => {
    const newGrid = [...userGrid];
    newGrid[y][x] = value.toUpperCase();
    setUserGrid(newGrid);
  };

  const isFirstLetter = (x: number, y: number): boolean => {
    if (!cwResult) return false;
    return cwResult.positionObjArr.some((w) => w.xNum === x && w.yNum === y);
  };

  const getLabelNumber = (x: number, y: number): number | null => {
    if (!cwResult) return null;
    const word = cwResult.positionObjArr.find(
      (w) => w.xNum === x && w.yNum === y,
    );
    if (!word) return null;
    return cwResult.positionObjArr.indexOf(word) + 1;
  };

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
                  {row.map((cell, x) => {
                    const isFirst = isFirstLetter(x, y);
                    const labelNumber = isFirst ? getLabelNumber(x, y) : null;
                    const userValue = userGrid[y]?.[x] || "";
                    if (cell === "") {
                      return (
                        <td
                          key={x}
                          style={{
                            border: "1px solid #ccc",
                            backgroundColor: "blue",
                            width: 32,
                            height: 32,
                            textAlign: "center",
                            position: "relative",
                          }}
                        />
                      );
                    }
                    const isCorrect = userValue === cell;

                    return (
                      <td
                        key={x}
                        style={{
                          border: "1px solid #ccc",
                          width: 32,
                          height: 32,
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        {isFirst && (
                          <div
                            style={{
                              color: "black",
                              position: "absolute",
                              top: 5,
                              left: 5,
                              fontSize: 8,
                            }}
                          >
                            {labelNumber}
                          </div>
                        )}
                        <input
                          type="text"
                          maxLength={1}
                          value={userValue}
                          onChange={(e) =>
                            handleInputChange(y, x, e.target.value)
                          }
                          style={{
                            width: 32,
                            height: 32,
                            border: "none",
                            textAlign: "center",
                            backgroundColor: isCorrect
                              ? "lightgreen"
                              : userValue && !isCorrect
                              ? "lightpink"
                              : "white",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Clues</h2>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <h3>Horizontal</h3>
              <ul>
                {cwResult.positionObjArr
                  .filter((w) => w.isHorizon)
                  .map((w, idx) => (
                    <li key={idx}>
                      <b>{cwResult.positionObjArr.indexOf(w) + 1}. </b>
                      {wordToDef[w.wordStr] || w.wordStr}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3>Vertical</h3>
              <ul>
                {cwResult.positionObjArr
                  .filter((w) => !w.isHorizon)
                  .map((w, idx) => (
                    <li key={idx}>
                      <b>{cwResult.positionObjArr.indexOf(w) + 1}. </b>
                      {wordToDef[w.wordStr] || w.wordStr}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </>
      )}
      {rows.length > 0 ? (
        <details>
          {" "}
          <summary>Words</summary>{" "}
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            {" "}
            <thead>
              {" "}
              <tr>
                {" "}
                <th style={{ border: "1px solid #ccc", padding: 8 }}>
                  Term
                </th>{" "}
                <th style={{ border: "1px solid #ccc", padding: 8 }}>
                  {" "}
                  Definition{" "}
                </th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              {rows.map((r, idx) => (
                <tr key={idx}>
                  {" "}
                  <td
                    style={{
                      border: "1px solid #eee",
                      padding: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    {" "}
                    {r.term}{" "}
                  </td>{" "}
                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {" "}
                    {r.def}{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>{" "}
        </details>
      ) : (
        selectedBase &&
        selectedSheet && (
          <p>No rows found (expect col A = term, col B = def).</p>
        )
      )}
    </div>
  );
}
