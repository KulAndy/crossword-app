import type { CWGResult } from "../types/CWGResult";
import type { PositionObject } from "../types/PositionObject";

interface CrosswordGridProperties {
  currentWord: null | PositionObject;
  cwResult: CWGResult | null;
  inputReferences: React.RefObject<HTMLInputElement[][]>;
  numberedLabels: Record<string, number>;
  onFocus: (y: number, x: number) => void;
  onInputChange: (y: number, x: number, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent, y: number, x: number) => void;
  setLastDirection: (x: "across" | "down" | null) => void;
  userGrid: string[][];
  wordDirection: "across" | "down" | null;
  wordToDefinition: Record<string, string>;
}

export const CrosswordGrid = ({
  currentWord,
  cwResult,
  inputReferences,
  numberedLabels,
  onFocus,
  onInputChange,
  onKeyDown,
  setLastDirection,
  userGrid,
  wordDirection,
  wordToDefinition,
}: CrosswordGridProperties) => {
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

  const isFirstLetter = (x: number, y: number): boolean => {
    if (!cwResult) return false;
    return !!numberedLabels[`${x},${y}`];
  };

  const getLabelNumber = (x: number, y: number): null | number => {
    if (!cwResult) return null;
    return numberedLabels[`${x},${y}`] || null;
  };
  const question = (
    <>
      {currentWord && (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 4,
            margin: 4,
            padding: 8,
            zIndex: 10,
          }}
        >
          <b>
            {numberedLabels[`${currentWord.xNum},${currentWord.yNum}`]}.
            {wordDirection === "across" ? " Across" : " Down"}
          </b>{" "}
          {wordToDefinition[currentWord.wordStr] || currentWord.wordStr}
        </div>
      )}
    </>
  );

  return (
    <div style={{ position: "relative" }}>
      {question}
      <table>
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
                        onInputChange(y, x, lastLetter);
                      }}
                      onClick={() => setLastDirection(null)}
                      onFocus={() => {
                        onFocus(y, x);
                      }}
                      onKeyDown={(event) => onKeyDown(event, y, x)}
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
  );
};
