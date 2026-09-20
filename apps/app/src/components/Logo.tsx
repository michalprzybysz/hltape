import { cn } from "@furious-abacus/ui/lib/utils";
import Image from "next/image";
import { BRAND_NAME } from "@/lib/brand";

const sizes = {
  sm: { text: "text-sm", icon: 18 },
  md: { text: "text-xl", icon: 24 },
  lg: { text: "text-3xl", icon: 32 },
} as const;

export function Logo({ size = "md" }: { size?: keyof typeof sizes }) {
  const { text, icon } = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono font-semibold", text)}>
      <Image src="/logo.svg" alt="" width={icon} height={icon} />
      <span>{BRAND_NAME}</span>
    </span>
  );
}
