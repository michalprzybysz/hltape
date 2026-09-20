"use client";

import { Button } from "@hltape/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hltape/ui/components/empty";
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
    <div className="flex flex-1 items-center justify-center">
      <Empty>
        <EmptyMedia variant="icon">
          <HiOutlineExclamationTriangle />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            {t("tryAgain")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const form = await Sentry.getFeedback()?.createForm();
              form?.appendToDom();
              form?.open();
            }}
          >
            {t("reportProblem")}
          </Button>
        </div>
      </Empty>
    </div>
  );
}
