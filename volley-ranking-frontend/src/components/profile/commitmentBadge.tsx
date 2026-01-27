"use client";

export function CommitmentBadge({ value }: { value: number }) {
  if (value >= 1) {
    return (
      <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
        🟢 Alto compromiso
      </span>
    );
  }

  if (value === 0) {
    return (
      <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
        🟡 Compromiso normal
      </span>
    );
  }

  return (
    <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
      🔴 Bajo compromiso
    </span>
  );
}
