// apps/app/src/components/PositionInstrument.tsx
import { cn } from "@furious-abacus/ui/lib/utils";
import { InstrumentLogo } from "@/components/InstrumentLogo";

interface InstrumentProps {
  instrument: string;
  className?: string;
  logoClassName?: string;
  size?: number;
  showSymbol?: boolean;
}

export const PositionInstrument = ({ instrument, className, size = 28 }: InstrumentProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <InstrumentLogo instrument={instrument} size={size} />
      <span className="font-medium text-gray-900 dark:text-white">{instrument.toUpperCase()}</span>
    </div>
  );
};
