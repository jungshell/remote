type NextActionsProps = {
  actions: string[];
};

export default function NextActions({ actions }: NextActionsProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
      <h2 className="text-lg font-semibold dark:text-zinc-100">✅ 다음 액션</h2>
      <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        {actions.map((action) => (
          <li key={action} className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}
