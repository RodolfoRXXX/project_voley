

type UserAvatarProps = {
  nombre?: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
};

export default function UserAvatar({
  nombre,
  photoURL,
  size = 32,
  className = "",
}: UserAvatarProps) {
  return (
    <div
      className={`rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={nombre ?? "Avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-gray-600">
          {nombre?.charAt(0).toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}
