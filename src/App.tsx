import { useEffect, useState, useRef, useCallback } from "react";
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
  const [currentWord, setCurrentWord] = useState<PositionObj | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lastDirection, setLastDirection] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const inputRefs = useRef<HTMLInputElement[][]>([]);

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
    if (!rows || rows.length === 0) {
      return;
    }
    try {
      const seen = new Set<string>();
      const uniqueRows = rows.filter((r) => {
        const key = r.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Use a seeded random engine for sorting
      const seededRandom = (seed: string) => {
        let value = 0;
        for (let i = 0; i < seed.length; i++) {
          value = (value << 5) - value + seed.charCodeAt(i);
          value |= 0;
        }
        return () => {
          value = Math.sin(value) * 10000;
          return value - Math.floor(value);
        };
      };

      const random = seededRandom(seed);

      const sortedRows = [...uniqueRows].sort(() => random() - 0.5);

      const wordList = sortedRows.map((r) => r.term.toUpperCase());

      const newWordList = wordList.slice(0, 2);
      let res: CWGResult = CWG(newWordList);

      for (let index = 2; index < wordList.length; index++) {
        const element = wordList[index];
        newWordList.push(element);
        const newRes = CWG(newWordList);
        res = newRes;
        if (newRes.width > 15 && newRes.height > 15) {
          break;
        }
        res = newRes;
      }

      console.log(res);

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

  const handleInputChange = useCallback(
    (y: number, x: number, value: string) => {
      const newGrid = [...userGrid];
      newGrid[y][x] = value.toUpperCase();
      setUserGrid(newGrid);

      if (!cwResult) return;

      const word = cwResult.positionObjArr.find((w) => {
        if (w.isHorizon) {
          return w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length;
        } else {
          return w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
        }
      });

      if (word) {
        setCurrentWord(word);
        const index = word.isHorizon ? x - word.xNum : y - word.yNum;
        setCurrentIndex(index);
        setLastDirection(word.isHorizon ? "horizontal" : "vertical");

        if (value && index < word.wordStr.length - 1) {
          const nextX = word.isHorizon ? x + 1 : x;
          const nextY = word.isHorizon ? y : y + 1;
          setTimeout(() => {
            inputRefs.current[nextY]?.[nextX]?.focus();
          }, 0);
        }
      }
    },
    [userGrid, cwResult],
  );

  const handleInputFocus = useCallback(
    (y: number, x: number) => {
      if (!cwResult) return;

      const word = cwResult.positionObjArr.find((w) => {
        if (w.isHorizon) {
          return w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length;
        } else {
          return w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
        }
      });

      if (word) {
        setCurrentWord(word);
        const index = word.isHorizon ? x - word.xNum : y - word.yNum;
        setCurrentIndex(index);
        setLastDirection(word.isHorizon ? "horizontal" : "vertical");
      }
    },
    [cwResult],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, y: number, x: number) => {
      if (!cwResult) return;

      const word = cwResult.positionObjArr.find((w) => {
        if (w.isHorizon) {
          return w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length;
        } else {
          return w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
        }
      });

      if (!word) {
        return;
      }

      const index = word.isHorizon ? x - word.xNum : y - word.yNum;

      if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
        e.preventDefault();
        const prevX = word.isHorizon ? x - 1 : x;
        const prevY = word.isHorizon ? y : y - 1;
        setTimeout(() => {
          inputRefs.current[prevY]?.[prevX]?.focus();
        }, 0);
      } else {
        let newX = x;
        let newY = y;
        switch (e.key) {
          case "ArrowRight":
            newX = x + 1;
            break;
          case "ArrowLeft":
            newX = x - 1;
            break;
          case "ArrowDown":
            newY = y + 1;
            break;
          case "ArrowUp":
            newY = y - 1;
            break;
          default:
            return;
        }

        e.preventDefault();
        setTimeout(() => {
          inputRefs.current[newY]?.[newX]?.focus();
        }, 0);
      }
    },
    [cwResult],
  );

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

  const question = (
    <>
      {currentWord && (
        <div
          style={{
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 4,
            zIndex: 10,
            left: lastDirection === "horizontal" ? 0 : "100%",
            top: lastDirection === "horizontal" ? "100%" : 0,
            margin: 4,
          }}
        >
          <b>
            {cwResult.positionObjArr.indexOf(currentWord) + 1}.
            {lastDirection === "horizontal" ? " Across" : " Down"}
          </b>{" "}
          {wordToDef[currentWord.wordStr] || currentWord.wordStr}
        </div>
      )}
    </>
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
              type="number"
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
          <div style={{ position: "relative" }}>
            {question}
            <table
              style={{
                borderCollapse: "collapse",
                fontFamily: "monospace",
                margin: "auto",
              }}
            >
              <tbody>
                {grid.map((row, y) => (
                  <tr key={y}>
                    {row.map((cell, x) => {
                      if (!inputRefs.current[y]) inputRefs.current[y] = [];
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
                                top: 2,
                                left: 2,
                                fontSize: 8,
                              }}
                            >
                              {labelNumber}
                            </div>
                          )}
                          <input
                            ref={(el) => (inputRefs.current[y][x] = el!)}
                            type="text"
                            maxLength={1}
                            value={userValue}
                            onChange={(e) =>
                              handleInputChange(y, x, e.target.value)
                            }
                            onKeyDown={(e) => handleKeyDown(e, y, x)}
                            onFocus={() => handleInputFocus(y, x)}
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
            {question}
          </div>
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
