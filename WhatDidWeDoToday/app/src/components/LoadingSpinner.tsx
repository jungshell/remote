/**
 * 로딩 스피너 컴포넌트
 */
"use client";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  text?: string;
};

export default function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`${sizeClasses[size]} border-amber-200 border-t-amber-500 rounded-full animate-spin`}
        role="status"
        aria-label="로딩 중"
      />
      {text && (
        <p className="text-sm text-stone-600 animate-pulse">{text}</p>
      )}
    </div>
  );
}
