import type { Row } from "../types/Row";

interface WordsTableProperties {
  rows: Row[];
}

export const WordsTable = ({ rows }: WordsTableProperties) => {
  return (
    <details>
      <summary>Words</summary>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Term</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Definition</th>
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
              <td style={{ border: "1px solid #eee", padding: 8 }}>{r.def}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
};
