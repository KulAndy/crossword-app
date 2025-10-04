import CWG, { type CWGResult, type PositionObject } from "cwg";
import Rand, { PRNG } from "rand-seed";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Row } from "./types/Row";

import { CluesList } from "./components/CluesList";
import { CrosswordGrid } from "./components/CrosswordGrid";
import { WordsTable } from "./components/WordsTable";
import { generateNumberedLabels } from "./utilities";

const baseUrl = import.meta.env.BASE_URL;
const maxWidth = 15;

interface Category {
  category: string;
  subcategories: string[];
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
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
        return resource.json() as Promise<Category[]>;
      })
      .then(setCategories)
      .catch((error) => {
        console.error(error);
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedCategory || !selectedSheet) {
      setRows([]);
      return;
    }

    const csvFileName = `${selectedCategory}/${selectedSheet}.csv`;
    const url = `${baseUrl}csv/${csvFileName}`;

    fetch(url)
      .then((resource) => {
        if (!resource.ok) throw new Error(`Failed to fetch ${url}`);
        return resource.text();
      })
      .then((csvData) => {
        const lines = csvData.split("\n");
        const parsed: Row[] = lines
          .map((line) => {
            const columns = line.split(";");
            return {
              def: columns[1] ? columns[1].trim() : "",
              term: columns[0] ? columns[0].trim() : "",
            };
          })
          .filter((row) => row.term && row.def);

        setRows(parsed);
      })
      .catch((error) => {
        console.error("Error reading CSV:", error);
        setRows([]);
      });
  }, [selectedCategory, selectedSheet]);

  useEffect(() => {
    if (currentWord) {
      setWordDirection(currentWord.isHorizon ? "across" : "down");
      setLastDirection(
        (previous) => previous ?? (currentWord.isHorizon ? "across" : "down"),
      );
    }
  }, [currentWord]);

  const isHorizon = useCallback(
    (w: PositionObject) =>
      (lastDirection === null && w.isHorizon) || lastDirection === "across",
    [lastDirection],
  );

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
        return isHorizon(w)
          ? w.yNum === y && w.xNum <= x && x < w.xNum + w.wordStr.length
          : w.xNum === x && w.yNum <= y && y < w.yNum + w.wordStr.length;
      });
      if (word) {
        setCurrentWord(word);
      }
    },
    [cwResult, isHorizon],
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
        return isHorizon(w)
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
          const nextX = wordDirection === "across" ? x + 1 : x;
          const nextY = wordDirection === "across" ? y : y + 1;
          setTimeout(() => {
            inputReferences.current[nextY]?.[nextX]?.focus();
            inputReferences.current[nextY]?.[nextX]?.select();
            if (inputReferences.current[nextY]?.[nextX]) {
              if (x !== nextX) {
                setLastDirection("across");
              } else if (y === nextY) {
                setLastDirection(null);
              } else {
                setLastDirection("down");
              }
            }
          }, 0);
        }
      }
    },
    [cwResult, userGrid, isHorizon, lastDirection],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, y: number, x: number) => {
      if (!cwResult) {
        return;
      }
      const word = cwResult.positionObjArr.find((w) => {
        return isHorizon(w)
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
          if (inputReferences.current[newY]?.[newX]) {
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
    [cwResult, isHorizon],
  );

  const wordToDefinition = Object.fromEntries(
    rows.map((r) => [r.term.toUpperCase(), r.def]),
  );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <h1>Bases / Sheets → Terms / Crossword</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <select
          onChange={(event) => {
            setSelectedCategory(event.target.value);
            setSelectedSheet("");
          }}
          value={selectedCategory}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.category} value={category.category}>
              {category.category}
            </option>
          ))}
        </select>
        <select
          disabled={!selectedCategory}
          onChange={(event) => setSelectedSheet(event.target.value)}
          value={selectedSheet}
        >
          <option value="">Select sheet</option>
          {selectedCategory &&
            categories
              .find((c) => c.category === selectedCategory)
              ?.subcategories.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
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
        selectedCategory &&
        selectedSheet && (
          <p>No rows found (expect col A = term, col B = def).</p>
        )
      )}
    </div>
  );
}
