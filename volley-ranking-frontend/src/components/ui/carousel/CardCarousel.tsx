"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

type CardCarouselProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;

  getKey?: (item: T, index: number) => React.Key;
  maxItems?: number;

  desktopCards?: number;
  tabletCards?: number;
  mobileCards?: number;

  showArrows?: boolean;
  showIndicators?: boolean;

  className?: string;
};

export default function CardCarousel<T>({
  items,
  renderItem,
  getKey,
  maxItems = 5,

  desktopCards = 3,
  tabletCards = 2,
  mobileCards = 1,

  showArrows = true,
  showIndicators = true,

  className = "",
}: CardCarouselProps<T>) {
  const displayedItems = useMemo(
    () => items.slice(0, maxItems),
    [items, maxItems]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(desktopCards);

  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth < 640) {
        setVisibleCards(mobileCards);
      } else if (window.innerWidth < 1024) {
        setVisibleCards(tabletCards);
      } else {
        setVisibleCards(desktopCards);
      }
    };

    updateVisibleCards();

    window.addEventListener("resize", updateVisibleCards);

    return () =>
      window.removeEventListener("resize", updateVisibleCards);
  }, [desktopCards, tabletCards, mobileCards]);

  const maxIndex = Math.max(
    0,
    displayedItems.length - visibleCards
  );

  useEffect(() => {
    setCurrentIndex((index) =>
      Math.min(index, maxIndex)
    );
  }, [maxIndex]);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < maxIndex;

  return (
    <div className={`relative w-full ${className}`}>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${
              currentIndex * (100 / visibleCards)
            }%)`,
          }}
        >
          {displayedItems.map((item, index) => (
            <div
              key={getKey ? getKey(item, index) : index}
              className="shrink-0"
              style={{
                width: `${100 / visibleCards}%`,
              }}
            >
              <div className="px-2 h-full">
                {renderItem(item, index)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showArrows && displayedItems.length > visibleCards && (
        <>
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => Math.max(i - 1, 0))
            }
            disabled={!canPrev}
            aria-label="Anterior"
            className="
              absolute
              left-2
              top-1/2
              -translate-y-1/2
              z-10
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-neutral-200
              bg-white/90
              shadow-sm
              transition
              hover:bg-white
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) =>
                Math.min(i + 1, maxIndex)
              )
            }
            disabled={!canNext}
            aria-label="Siguiente"
            className="
              absolute
              right-2
              top-1/2
              -translate-y-1/2
              z-10
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-neutral-200
              bg-white/90
              shadow-sm
              transition
              hover:bg-white
              disabled:opacity-40
              disabled:cursor-not-allowed
            "
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {showIndicators && displayedItems.length > visibleCards && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir a la página ${index + 1}`}
              className={`
                h-2.5
                rounded-full
                transition-all
                ${
                  currentIndex === index
                    ? "w-6 bg-orange-500"
                    : "w-2.5 bg-neutral-300 hover:bg-neutral-400"
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}