
// -------------------
// USER AVATAR
// -------------------

"use client";

import { useState } from "react";

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
  const [imgError, setImgError] = useState(false);

  // Generar iniciales (más elegante que solo la primera letra)
  const initials =
    nombre
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const showImage = photoURL && !imgError;

  return (
    <div
      className={`rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={photoURL}
          alt={nombre ?? "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)} // 👈 CLAVE
        />
      ) : (
        <span className="text-xs font-semibold text-gray-600">
          {initials}
        </span>
      )}
    </div>
  );
}
