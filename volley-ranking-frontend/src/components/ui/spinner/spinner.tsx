
type SpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function Spinner({ className = "", size = "md" }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-current ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="none"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 00-9.95 9h4.2A5.8 5.8 0 0112 6.2V2z"
      />
    </svg>
  );
}
