"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";

const THRESHOLD = 64;

export function PullToRefresh({
  children,
  onRefresh,
}: {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const refresh = useRef(onRefresh);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    refresh.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    let busy = false;
    let disposed = false;
    const reset = () => {
      start = null;
      pulled = 0;
      setDistance(0);
    };
    const onStart = (event: TouchEvent) => {
      if (busy) return;
      reset();
      if (event.touches.length !== 1 || element.scrollTop > 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest("input,textarea,select,[contenteditable=true]")
      )
        return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
    };
    const onMove = (event: TouchEvent) => {
      if (!start || busy) return;
      if (event.touches.length !== 1 || element.scrollTop > 0) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const dy = touch.clientY - start.y;
      if (dy <= 0 || Math.abs(touch.clientX - start.x) > Math.abs(dy)) {
        reset();
        return;
      }
      // The list owns this downward gesture; keep the pinned composer in place.
      if (!event.cancelable) {
        reset();
        return;
      }
      event.preventDefault();
      pulled = Math.min(92, dy * 0.5);
      setDistance(pulled);
    };
    const onEnd = () => {
      if (!start || busy) return;
      const shouldRefresh = pulled >= THRESHOLD;
      reset();
      if (!shouldRefresh) return;
      busy = true;
      setRefreshing(true);
      void (async () => {
        try {
          await refresh.current();
        } finally {
          busy = false;
          if (!disposed) setRefreshing(false);
        }
      })();
    };
    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", reset);
    return () => {
      disposed = true;
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", reset);
    };
  }, []);

  return (
    <div
      ref={container}
      className="discussion-scroll"
      tabIndex={0}
      aria-label="Discussion list"
    >
      <div
        className="pull-refresh"
        style={{ height: refreshing ? 44 : distance }}
      >
        {refreshing ? (
          <RefreshCw size={16} className="spin" />
        ) : (
          <ArrowDown
            size={16}
            style={{
              transform: distance >= THRESHOLD ? "rotate(180deg)" : undefined,
            }}
          />
        )}
        <span role="status">
          {refreshing
            ? "Refreshing…"
            : distance >= THRESHOLD
              ? "Release to refresh"
              : distance > 0
                ? "Pull down to refresh"
                : ""}
        </span>
      </div>
      {children}
    </div>
  );
}
