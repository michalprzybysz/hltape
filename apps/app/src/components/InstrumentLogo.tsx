// apps/app/src/components/InstrumentLogo.tsx

import { cn } from "@hltape/ui/lib/utils";
import Image from "next/image";
import { LOGOKIT_TOKEN } from "@/lib/brand";

interface InstrumentLogoProps {
  instrument: string;
  size?: number;
  className?: string;
}

export const InstrumentLogo = ({ instrument, size = 28, className }: InstrumentLogoProps) => {
  const symbol = instrument.toUpperCase();

  // Without a LogoKit token there is nothing to fetch, so fall back to the leading letters of
  // the symbol. Every deployment brings its own token; see NEXT_PUBLIC_LOGOKIT_TOKEN.
  if (!LOGOKIT_TOKEN) {
    return (
      <span
        aria-label={symbol}
        role="img"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300",
          className,
        )}
      >
        {symbol.slice(0, 2)}
      </span>
    );
  }

  const iconUrl = `https://img.logokit.com/crypto/${symbol}?token=${LOGOKIT_TOKEN}`;

  return (
    <Image
      src={iconUrl}
      alt={symbol}
      width={size}
      height={size}
      className={cn("rounded-full bg-gray-100 dark:bg-gray-800 object-cover", className)}
      unoptimized
    />
  );
};
