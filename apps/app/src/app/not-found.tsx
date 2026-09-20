import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hltape/ui/components/empty";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

export default function NotFound() {
  const t = useTranslations("error");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Empty>
        <EmptyMedia variant="icon">
          <HiOutlineMagnifyingGlass />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("notFoundTitle")}</EmptyTitle>
          <EmptyDescription>{t("notFoundDescription")}</EmptyDescription>
        </EmptyHeader>
        <Link
          href="/"
          className="inline-flex h-7 items-center justify-center rounded-lg border border-input bg-transparent px-2.5 text-[0.8rem] font-medium text-foreground hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50"
        >
          {t("goHome")}
        </Link>
      </Empty>
    </div>
  );
}
