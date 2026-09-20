"use client";

import { Badge } from "@furious-abacus/ui/components/badge";
import { Input } from "@furious-abacus/ui/components/input";
import { Spinner } from "@furious-abacus/ui/components/spinner";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { getCoinName } from "@/lib/coinNames";
import useFormatter from "@/lib/useFormatter";
import type { CoinOption } from "./types";

interface PerpSearchPanelProps {
  items: CoinOption[];
  isLoading: boolean;
  onSelect: (coin: string) => void;
}

export function PerpSearchPanel({ items, isLoading, onSelect }: PerpSearchPanelProps) {
  const t = useTranslations("openPosition");
  const fmt = useFormatter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const full = getCoinName(item.name)?.toLowerCase() ?? "";
      return item.name.toLowerCase().includes(q) || full.includes(q);
    });
  }, [items, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative px-4">
        <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto px-2">
        <div
          aria-hidden
          className="pointer-events-none sticky top-0 z-10 -mb-4 h-4 bg-gradient-to-b from-[var(--bg-fade)] to-transparent"
        />
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noPerpetuals")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((item) => {
              const fullName = getCoinName(item.name);
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                      {item.maxLeverage}x
                    </Badge>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{fullName ?? item.name}</span>
                      {fullName && (
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {item.name}
                        </span>
                      )}
                    </div>
                    {item.price && (
                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                        {fmt.crypto(Number(item.price), "")}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
