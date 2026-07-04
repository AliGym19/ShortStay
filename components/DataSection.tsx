type Cell = string | number | boolean | null | undefined;

interface DataSectionProps {
  title: string;
  subtitle?: string;
  error?: string;
  columns?: string[];
  rows?: Cell[][];
  highlight?: boolean[];
  raw?: unknown;
}

export default function DataSection({
  title,
  subtitle,
  error,
  columns = [],
  rows = [],
  highlight = [],
  raw,
}: DataSectionProps) {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p> : null}

      {error ? (
        <p className="mt-3 rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No records.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                {columns.map((col) => (
                  <th key={col} className="py-2 pr-4 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-zinc-100 dark:border-zinc-800/60 ${
                    highlight[i] ? "bg-green-50 dark:bg-green-950/40" : ""
                  }`}
                >
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-4">
                      {cell === null || cell === undefined || cell === ""
                        ? "—"
                        : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {raw !== undefined && !error ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500">Raw JSON</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded bg-zinc-100 dark:bg-zinc-800 p-3 text-xs">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
