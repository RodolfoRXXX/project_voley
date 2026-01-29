"use client";

type Props = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

export default function FormField({
  label,
  required,
  error,
  children,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="block font-semibold">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {children}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
