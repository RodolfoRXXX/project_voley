type Props = {
  value: number;
};

export default function CompromisoBadge({ value }: Props) {
  let label = "Normal";
  let style = "bg-yellow-100 text-yellow-700";

  if (value >= 3) {
    label = "Alto";
    style = "bg-green-100 text-green-700";
  } else if (value < 0) {
    label = "Bajo";
    style = "bg-red-100 text-red-700";
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${style}`}>
      🤝 Compromiso {label}
    </span>
  );
}
