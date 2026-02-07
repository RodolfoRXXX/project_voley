type Props = {
  value: number;
};

export default function CommitmentBadge({ value }: Props) {
  let label = "Normal";
  let style =
    "bg-yellow-100 text-yellow-800 border border-yellow-200";

  if (value >= 3) {
    label = "Alto";
    style =
      "bg-green-100 text-green-800 border border-green-200";
  } else if (value < 0) {
    label = "Bajo";
    style =
      "bg-red-100 text-red-800 border border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${style}`}
    >
      🤝 Compromiso {label}
    </span>
  );
}
