import type { CWGResult } from "cwg";

interface CluesListProperties {
  cwResult: CWGResult | null;
  numberedLabels: Record<string, number>;
  wordToDefinition: Record<string, string>;
}

export const CluesList = ({
  cwResult,
  numberedLabels,
  wordToDefinition,
}: CluesListProperties) => {
  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div>
        <h3>Horizontal</h3>
        <ul>
          {cwResult?.positionObjArr
            .filter((w) => w.isHorizon)
            .toSorted(
              (a, b) =>
                (numberedLabels[`${a.xNum},${a.yNum}`] || 0) -
                (numberedLabels[`${b.xNum},${b.yNum}`] || 0),
            )
            .map((w, index) => (
              <li key={index}>
                <b>{numberedLabels[`${w.xNum},${w.yNum}`]}. </b>
                {wordToDefinition[w.wordStr] || w.wordStr}
              </li>
            ))}
        </ul>
      </div>
      <div>
        <h3>Vertical</h3>
        <ul>
          {cwResult?.positionObjArr
            .filter((w) => !w.isHorizon)
            .toSorted(
              (a, b) =>
                (numberedLabels[`${a.xNum},${a.yNum}`] || 0) -
                (numberedLabels[`${b.xNum},${b.yNum}`] || 0),
            )
            .map((w, index) => (
              <li key={index}>
                <b>{numberedLabels[`${w.xNum},${w.yNum}`]}. </b>
                {wordToDefinition[w.wordStr] || w.wordStr}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};
