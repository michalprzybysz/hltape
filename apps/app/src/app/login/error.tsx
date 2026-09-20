"use client";

import { Button } from "@furious-abacus/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@furious-abacus/ui/components/empty";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyMedia variant="icon">
          <HiOutlineExclamationTriangle />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" size="sm" onClick={reset}>
          {t("tryAgain")}
        </Button>
      </Empty>
    </div>
  );
}
