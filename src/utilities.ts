import type { CWGResult } from "./types/CWGResult";

export const generateNumberedLabels = (
  cwResult: CWGResult | null,
): Record<string, number> => {
  if (!cwResult) {
    return {};
  }

  const labels: Record<string, number> = {};
  let labelCounter = 1;

  const sortedObjects = cwResult.positionObjArr.toSorted(
    (a, b) => a.yNum * 10_000 - b.yNum * 10_000 + a.xNum - b.xNum,
  );

  for (const word of sortedObjects) {
    const key = `${word.xNum},${word.yNum}`;
    const previousKey = word.isHorizon
      ? `${word.xNum - 1},${word.yNum}`
      : `${word.xNum},${word.yNum - 1}`;

    if (labels[previousKey]) {
      continue;
    }
    if (!labels[key]) {
      labels[key] = labelCounter++;
    }
  }

  return labels;
};
