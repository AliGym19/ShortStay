export default function TriagePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold">Issue Triage</h1>
      <p className="mt-1 text-sm text-zinc-500">Coming in v1 — design locked.</p>
      <div className="mt-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          Triage v1: property issues are submitted via a manual form (email and
          webhook intake later). An LLM classifies each issue into{" "}
          <code className="font-mono">
            {"{severity: P1–P4, category, suggested_action, confidence}"}
          </code>{" "}
          and places it in a human-in-the-loop queue — no auto-actioning in v1.
        </p>
        <p className="mt-3">
          The triage layer never touches Xero write scopes; it is fully
          decoupled from the accounting connection.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Full design: <code className="font-mono">docs/triage-v1.md</code>
        </p>
      </div>
    </div>
  );
}
