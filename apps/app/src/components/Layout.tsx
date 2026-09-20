// apps/app/src/components/Layout.tsx

import { TooltipProvider } from "@furious-abacus/ui/components/tooltip";
import { cn } from "@furious-abacus/ui/lib/utils";
import Providers from "@/components/providers";

export default async function Layout({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn(className)}>
      <Providers>
        <TooltipProvider>{children}</TooltipProvider>
      </Providers>
    </div>
  );
}
