"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@furious-abacus/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@furious-abacus/ui/components/drawer";
import { useMediaQuery } from "@furious-abacus/ui/hooks/use-media-query";
import { useTranslations } from "next-intl";
import { PerpSearchPanel } from "./PerpSearchPanel";
import type { CoinOption } from "./types";

interface PerpSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CoinOption[];
  isLoading: boolean;
  onSelect: (coin: string) => void;
}

export function PerpSelectSheet({
  open,
  onOpenChange,
  items,
  isLoading,
  onSelect,
}: PerpSelectSheetProps) {
  const t = useTranslations("openPosition");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const panel = <PerpSearchPanel items={items} isLoading={isLoading} onSelect={onSelect} />;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[60vh] max-h-[90vh] min-h-[400px] flex-col gap-0 p-0 sm:max-w-2xl [--bg-fade:var(--background)]">
          <DialogHeader className="px-4 pt-4 pb-3">
            <DialogTitle>{t("selectPerpetual")}</DialogTitle>
          </DialogHeader>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested>
      <DrawerContent className="h-[60vh] data-[vaul-drawer-direction=bottom]:max-h-[60vh] [--bg-fade:var(--popover)]">
        <DrawerHeader>
          <DrawerTitle>{t("selectPerpetual")}</DrawerTitle>
        </DrawerHeader>
        {panel}
      </DrawerContent>
    </Drawer>
  );
}
