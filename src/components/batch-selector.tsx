"use client";

import { TOTAL_BATCHES } from "@/lib/questions";

interface BatchSelectorProps {
  selected: number | null;
  onSelect: (batch: number) => void;
}

export function BatchSelector({ selected, onSelect }: BatchSelectorProps) {
  return (
    <div className="flex gap-3">
      {Array.from({ length: TOTAL_BATCHES }, (_, i) => i + 1).map((b) => (
        <button
          key={b}
          onClick={() => onSelect(b)}
          className={`flex-1 rounded-xl border-2 py-4 font-bold text-lg transition-all ${
            selected === b
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
          }`}
        >
          Batch {b}
        </button>
      ))}
    </div>
  );
}
