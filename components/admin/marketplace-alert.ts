"use client";

import * as React from "react";

let currentCount = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcastMarketplaceNotificationCount(count: number): void {
  const next = Number.isInteger(count) && count > 0 ? count : 0;
  if (next === currentCount) return;
  currentCount = next;
  for (const listener of listeners) listener();
}

export function useMarketplaceNotificationCount(): number {
  return React.useSyncExternalStore(
    subscribe,
    () => currentCount,
    () => 0,
  );
}
