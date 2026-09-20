"use client";

import { ToggleGroup, ToggleGroupItem } from "@furious-abacus/ui/components/toggle-group";
import type { ReactNode } from "react";

interface PresetToggleProps<T extends number> {
  presets: readonly T[];
  selected: T | null | undefined;
  onSelect: (value: T) => void;
  formatLabel: (value: T) => ReactNode;
  className?: string;
}

export function PresetToggle<T extends number>({
  presets,
  selected,
  onSelect,
  formatLabel,
  className,
}: PresetToggleProps<T>) {
  return (
    <ToggleGroup
      value={selected != null ? [String(selected)] : []}
      onValueChange={(pressed) => {
        const val = pressed[pressed.length - 1];
        if (val !== undefined) onSelect(Number(val) as T);
      }}
      size="sm"
      variant="outline"
      className={className}
    >
      {presets.map((p) => (
        <ToggleGroupItem key={p} value={String(p)} className="flex-1">
          {formatLabel(p)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
