"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@hltape/ui/components/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@hltape/ui/components/drawer";
import { useMediaQuery } from "@hltape/ui/hooks/use-media-query";
import { useTranslations } from "next-intl";
import { PerpSearchPanel } from "./PerpSearchPanel";
import type { CoinOption } from "./types";

interface OpenPositionSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CoinOption[];
  isLoading: boolean;
  onSelect: (coin: string) => void;
}

export function OpenPositionSearchSheet({
  open,
  onOpenChange,
  items,
  isLoading,
  onSelect,
}: OpenPositionSearchSheetProps) {
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[60vh] data-[vaul-drawer-direction=bottom]:max-h-[60vh] [--bg-fade:var(--popover)]">
        <DrawerHeader>
          <DrawerTitle>{t("selectPerpetual")}</DrawerTitle>
        </DrawerHeader>
        {panel}
      </DrawerContent>
    </Drawer>
  );
}
