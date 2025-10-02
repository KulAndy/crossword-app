import CWG, { type CWGResult, type PositionObject } from "cwg";
import { useCallback, useEffect, useRef, useState } from "react";
import Rand, { PRNG } from "rand-seed";
import * as XLSX from "xlsx";

interface Row {
  def: string;
  term: string;
}

type WorkbookData = {
  sheets: string[];
  workbook: XLSX.WorkBook;
};

const baseUrl = import.meta.env.BASE_URL;

export default function App() {
  const [bases, setBases] = useState<string[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [workbookData, setWorkbookData] = useState<null | WorkbookData>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [cwResult, setCwResult] = useState<CWGResult | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [currentWord, setCurrentWord] = useState<null | PositionObject>(null);
  const [lastDirection, setLastDirection] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const inputReferences = useRef<HTMLInputElement[][]>([]);

  useEffect(() => {
    fetch(`${baseUrl}bases.json`)
      .then((resource) => {
        if (!resource.ok) throw new Error("Failed to load /bases.json");
        return resource.json() as Promise<string[]>;
      })
      .then(setBases)
      .catch((error) => {
        console.error(error);
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
    const url = `${baseUrl}bases/${encodeURIComponent(selectedBase)}`;
    fetch(url)
      .then((resource) => {
        if (!resource.ok) throw new Error(`Failed to fetch ${url}`);
        return resource.arrayBuffer();
      })
      .then((buffer) => {
        const wb = XLSX.read(buffer, { type: "array" });
        setWorkbookData({ sheets: wb.SheetNames, workbook: wb });
        setSelectedSheet("");
        setRows([]);
      })
      .catch((error) => {
        console.error("Error reading workbook:", error);
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
        def: (r[1] ?? "").toString().trim(),
        term: (r[0] ?? "").toString().trim(),
      }))
      .filter((r) => r.term.length > 0 && r.def.length > 0);
    setRows(parsed);
  }, [workbookData, selectedSheet]);

  const handleGenerate = () => {
    if (!rows || rows.length === 0) {
      return;
    }
    try {
      const rand = new Rand(new Date().toISOString(), PRNG.xoshiro128ss);

      const wordList = rows
        .map((r) => r.term.toUpperCase())
        .toSorted(() => rand.next() - 0.5);

      const newWordList = wordList.slice(0, 2);
      let resul: CWGResult = CWG(newWordList);

      for (let index = 2; index < wordList.length; index++) {
        const element = wordList[index];
        newWordList.push(element);
        const newResult = CWG(newWordList);
        resul = newResult;
        if (newResult.width > 15 && newResult.height > 15) {
          break;
        }
        resul = newResult;
      }

      setCwResult(resul);
      setUserGrid(
        Array.from({ length: resul.height }, () =>
          Array.from({ length: resul.width }, () => ""),
        ),
      );
    } catch (error) {
      console.error("Crossword generation failed:", error);
      setCwResult(null);
    }
  };

  const renderGrid = (): string[][] => {
    if (!cwResult) return [];
    const { height, positionObjArr, width } = cwResult;
    const grid: string[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ""),
    );

    for (const w of positionObjArr) {
      for (let index = 0; index < w.wordStr.length; index++) {
        if (w.isHorizon) grid[w.yNum][w.xNum + index] = w.wordStr[index];
        else grid[w.yNum + index][w.xNum] = w.wordStr[index];
      }
    }

    return grid;
  };

  const grid = renderGrid();
  const wordToDefinition = Object.fromEntries(
    rows.map((r) => [r.term.toUpperCase(), r.def]),
  );

  const handleInputChange = useCallback(
    (y: number, x: number, value: string) => {
      if (!cwResult) {
        return;
      }

      const newGrid = [...userGrid];
      newGrid[y][x] = value.toUpperCase();
      setUserGrid(newGrid);

      const word = cwResult.positionObjArr.find((w) => {
        return w.isHorizon
          ? w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length
          : w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
      });

      if (word) {
        setCurrentWord(word);
        const index = word.isHorizon ? x - word.xNum : y - word.yNum;
        const wordDirection =
          (lastDirection ?? word.isHorizon) ? "horizontal" : "vertical";

        setLastDirection((previous) => previous ?? wordDirection);

        if (value && index < word.wordStr.length - 1) {
          const nextX = lastDirection === "horizontal" ? x + 1 : x;
          const nextY = lastDirection === "horizontal" ? y : y + 1;
          setTimeout(() => {
            inputReferences.current[nextY]?.[nextX]?.focus();
            inputReferences.current[nextY]?.[nextX]?.select();
          }, 0);
        }
      }
    },
    [userGrid, cwResult, lastDirection],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, y: number, x: number) => {
      if (!cwResult) {
        return;
      }

      const word = cwResult.positionObjArr.find((w) => {
        return w.isHorizon
          ? w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length
          : w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
      });

      if (!word) {
        return;
      }

      const index = word.isHorizon ? x - word.xNum : y - word.yNum;
      const target = event.currentTarget as HTMLInputElement;

      if (event.key === "Backspace" && !target.value && index > 0) {
        event.preventDefault();
        const previousX = word.isHorizon ? x - 1 : x;
        const previousY = word.isHorizon ? y : y - 1;
        setTimeout(() => {
          inputReferences.current[previousY]?.[previousX]?.focus();
        }, 0);
      } else {
        let newX = x;
        let newY = y;

        switch (event.key) {
          case "ArrowDown": {
            newY = y + 1;
            break;
          }
          case "ArrowLeft": {
            newX = x - 1;
            break;
          }
          case "ArrowRight": {
            newX = x + 1;
            break;
          }
          case "ArrowUp": {
            newY = y - 1;
            break;
          }
          default: {
            return;
          }
        }

        event.preventDefault();
        setTimeout(() => {
          inputReferences.current[newY]?.[newX]?.focus();

          const word = cwResult.positionObjArr.find((w) => {
            return w.isHorizon
              ? w.yNum === newY &&
                  w.xNum <= newX &&
                  newX < w.xNum + w.wordStr.length
              : w.xNum === newX &&
                  w.yNum <= newY &&
                  newY < w.yNum + w.wordStr.length;
          });
          if (word) {
            setLastDirection(word.isHorizon ? "horizontal" : "vertical");
          }
        }, 0);
      }
    },
    [cwResult],
  );

  const isFirstLetter = (x: number, y: number): boolean => {
    if (!cwResult) return false;
    return cwResult.positionObjArr.some((w) => w.xNum === x && w.yNum === y);
  };

  const getLabelNumber = (x: number, y: number): null | number => {
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
            border: "1px solid #ccc",
            borderRadius: 4,
            left: lastDirection === "horizontal" ? 0 : "100%",
            margin: 4,
            padding: 8,
            top: lastDirection === "horizontal" ? "100%" : 0,
            zIndex: 10,
          }}
        >
          <b>
            {cwResult && cwResult.positionObjArr.indexOf(currentWord) + 1}.
            {lastDirection === "horizontal" ? " Across" : " Down"}
          </b>
          {wordToDefinition[currentWord.wordStr] || currentWord.wordStr}
        </div>
      )}
    </>
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <h1>Bases / Sheets → Terms / Crossword</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <select
          onChange={(event) => setSelectedBase(event.target.value)}
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
          onChange={(event) => setSelectedSheet(event.target.value)}
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
      {rows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={handleGenerate}
            style={{ marginLeft: 10 }}
            type="button"
          >
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
                      if (!inputReferences.current[y])
                        inputReferences.current[y] = [];
                      const isFirst = isFirstLetter(x, y);
                      const labelNumber = isFirst ? getLabelNumber(x, y) : null;
                      const userValue = userGrid[y]?.[x] || "";
                      if (cell === "") {
                        return (
                          <td
                            key={x}
                            style={{
                              backgroundColor: "blue",
                              border: "1px solid #ccc",
                              height: 32,
                              position: "relative",
                              textAlign: "center",
                              width: 32,
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
                            height: 32,
                            position: "relative",
                            textAlign: "center",
                            width: 32,
                          }}
                        >
                          {isFirst && (
                            <div
                              style={{
                                color: "black",
                                fontSize: 8,
                                left: 2,
                                position: "absolute",
                                top: 2,
                              }}
                            >
                              {labelNumber}
                            </div>
                          )}
                          <input
                            maxLength={2}
                            onChange={(event) => {
                              const lastLetter = event.target.value.slice(-1);
                              event.target.value = lastLetter;
                              handleInputChange(y, x, lastLetter);
                            }}
                            onClick={() => setLastDirection(null)}
                            onKeyDown={(event) => handleKeyDown(event, y, x)}
                            ref={(element) => {
                              if (element) {
                                inputReferences.current[y][x] = element;
                              }
                            }}
                            style={{
                              backgroundColor: isCorrect
                                ? "lightgreen"
                                : userValue && !isCorrect
                                  ? "lightpink"
                                  : "white",
                              border: "none",
                              height: 32,
                              textAlign: "center",
                              width: 32,
                            }}
                            type="text"
                            value={userValue}
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
                  .map((w, index) => (
                    <li key={index}>
                      <b>{cwResult.positionObjArr.indexOf(w) + 1}. </b>
                      {wordToDefinition[w.wordStr] || w.wordStr}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3>Vertical</h3>
              <ul>
                {cwResult.positionObjArr
                  .filter((w) => !w.isHorizon)
                  .map((w, index) => (
                    <li key={index}>
                      <b>{cwResult.positionObjArr.indexOf(w) + 1}. </b>
                      {wordToDefinition[w.wordStr] || w.wordStr}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </>
      )}
      {rows.length > 0 ? (
        <details>
          <summary>Words</summary>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Term</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>
                  Definition
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => (
                <tr key={index}>
                  <td
                    style={{
                      border: "1px solid #eee",
                      fontFamily: "monospace",
                      padding: 8,
                    }}
                  >
                    {r.term}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 8 }}>
                    {r.def}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
