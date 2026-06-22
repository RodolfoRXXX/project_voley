"use client";

import { useEffect, useRef, useState } from "react";

type FilterMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function FilterMenu({ isOpen, onClose, children }: FilterMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute top-full right-0 z-50 mt-2 rounded-lg border border-neutral-200 bg-white shadow-lg" 
      style={{ minWidth: "320px", maxWidth: "calc(100vw - 32px)" }}
    >
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
