import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullYRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!pullingRef.current || refreshing) return;
      const dist = e.touches[0].clientY - startYRef.current;
      if (dist > 0) {
        const clamped = Math.min(dist * 0.5, THRESHOLD * 1.3);
        pullYRef.current = clamped;
        setPullY(clamped);
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullYRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPullY(0);
      pullYRef.current = 0;
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullY(0);
      pullYRef.current = 0;
    }
    startYRef.current = 0;
  }, [onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const indicatorHeight = refreshing ? 48 : pullY > 0 ? pullY : 0;
  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: indicatorHeight }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-[#1B5E3B] animate-spin" />
        ) : (
          <Loader2
            className="w-5 h-5 text-[#1B5E3B]"
            style={{
              opacity: progress,
              transform: `rotate(${progress * 360}deg)`,
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
}