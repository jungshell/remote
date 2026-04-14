"use client";

type TaskCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
};

export function TaskCheckbox({ checked, onToggle, disabled, size = "md", ariaLabel = "완료 토글" }: TaskCheckboxProps) {
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={checked}
      role="checkbox"
      className={`shrink-0 mt-0.5 rounded border-2 flex items-center justify-center transition-transform active:scale-95 hover:opacity-90 disabled:opacity-50 ${sizeClass}`}
      style={{
        borderColor: checked ? "var(--indigo-600)" : "#cbd5e1",
        backgroundColor: checked ? "var(--indigo-600)" : "transparent",
      }}
    >
      {checked && (
        <svg className={size === "sm" ? "w-3 h-3 text-white" : "w-3.5 h-3.5 text-white"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
