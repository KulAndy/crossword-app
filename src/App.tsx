import CWG, { type CWGResult, type PositionObject } from "cwg";
import Rand, { PRNG } from "rand-seed";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import type { Row } from "./types/Row";
import type { WorkbookData } from "./types/WorkbookData";

import { CluesList } from "./components/CluesList";
import { CrosswordGrid } from "./components/CrosswordGrid";
import { FileSelector } from "./components/FileSelector";
import { WordsTable } from "./components/WordsTable";
import { generateNumberedLabels } from "./utilities";

const baseUrl = import.meta.env.BASE_URL;
const maxWidth = 15;

export default function App() {
  const [bases, setBases] = useState<string[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [workbookData, setWorkbookData] = useState<null | WorkbookData>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [cwResult, setCwResult] = useState<CWGResult | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [currentWord, setCurrentWord] = useState<null | PositionObject>(null);
  const [lastDirection, setLastDirection] = useState<"across" | "down" | null>(
    null,
  );
  const [wordDirection, setWordDirection] = useState<"across" | "down" | null>(
    null,
  );
  const inputReferences = useRef<HTMLInputElement[][]>([]);

  const numberedLabels = generateNumberedLabels(cwResult);

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
    if (currentWord) {
      setWordDirection(currentWord.isHorizon ? "across" : "down");
      setLastDirection(
        (previous) => previous ?? (currentWord.isHorizon ? "across" : "down"),
      );
    }
  }, [currentWord]);

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
        .filter((item) => item.length <= maxWidth)
        .toSorted(() => rand.next() - 0.5);

      const newWordList = wordList.slice(0, 2);
      let resul: CWGResult = CWG(newWordList);

      for (let index = 2; index < wordList.length; index++) {
        const element = wordList[index];
        newWordList.push(element);
        const newResult = CWG(newWordList);
        resul = newResult;
        if (newResult.width > maxWidth && newResult.height > maxWidth) {
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

  const handleFocus = useCallback(
    (y: number, x: number) => {
      if (!cwResult) {
        return;
      }

      const word = cwResult.positionObjArr.find((w) => {
        return w.isHorizon
          ? w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length
          : w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
      });

      if (word) {
        setCurrentWord(word);
      }
    },
    [cwResult],
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
          lastDirection ?? (word.isHorizon ? "across" : "down");

        setLastDirection((previous) => previous ?? wordDirection);

        if (value && index < word.wordStr.length - 1) {
          const nextX = lastDirection === "across" ? x + 1 : x;
          const nextY = lastDirection === "across" ? y : y + 1;
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
            if (x !== newX) {
              setLastDirection("across");
            } else if (y === newY) {
              setLastDirection(null);
            } else {
              setLastDirection("down");
            }
          }
        }, 0);
      }
    },
    [cwResult],
  );

  const wordToDefinition = Object.fromEntries(
    rows.map((r) => [r.term.toUpperCase(), r.def]),
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <h1>Bases / Sheets → Terms / Crossword</h1>
      <FileSelector
        bases={bases}
        onSelectBase={setSelectedBase}
        onSelectSheet={setSelectedSheet}
        selectedBase={selectedBase}
        selectedSheet={selectedSheet}
        workbookData={workbookData}
      />
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
          <CrosswordGrid
            currentWord={currentWord}
            cwResult={cwResult}
            inputReferences={inputReferences}
            numberedLabels={numberedLabels}
            onFocus={handleFocus}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            setLastDirection={setLastDirection}
            userGrid={userGrid}
            wordDirection={wordDirection}
            wordToDefinition={wordToDefinition}
          />
          <h2>Clues</h2>
          <CluesList
            cwResult={cwResult}
            numberedLabels={numberedLabels}
            wordToDefinition={wordToDefinition}
          />
        </>
      )}
      {rows.length > 0 ? (
        <WordsTable rows={rows} />
      ) : (
        selectedBase &&
        selectedSheet && (
          <p>No rows found (expect col A = term, col B = def).</p>
        )
      )}
    </div>
  );
}
