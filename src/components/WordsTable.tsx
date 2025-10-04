import type { Row } from "../types/Row";

interface WordsTableProperties {
  rows: Row[];
}

export const WordsTable = ({ rows }: WordsTableProperties) => {
  return (
    <details>
      <summary>Words</summary>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Term</th>
            <th>Definition</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => (
            <tr key={index}>
              <td>{r.term}</td>
              <td>{r.def}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
};
