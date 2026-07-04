interface ConnectionCardProps {
  tenantName: string;
  expiresAt: number;
  grantedScopes: string[];
  missingScopes: string[];
}

export default function ConnectionCard({
  tenantName,
  expiresAt,
  grantedScopes,
  missingScopes,
}: ConnectionCardProps) {
  const minutesLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 60_000));

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
          <div>
            <p className="font-medium">{tenantName}</p>
            <p className="text-xs text-zinc-500">
              Connected · token expires in ~{minutesLeft} min
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <form action="/api/auth/refresh" method="post">
            <button className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Refresh token
            </button>
          </form>
          <form action="/api/auth/disconnect" method="post">
            <button className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Disconnect
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Granted scopes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grantedScopes.map((scope) => (
            <span
              key={scope}
              className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-mono"
            >
              {scope}
            </span>
          ))}
        </div>
        {missingScopes.length > 0 ? (
          <p className="mt-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Scope mismatch — requested but not granted:{" "}
            {missingScopes.join(", ")}
          </p>
        ) : (
          <p className="mt-3 text-xs text-green-700 dark:text-green-400">
            All requested accounting scopes granted (read-only).
          </p>
        )}
      </div>
    </section>
  );
}
