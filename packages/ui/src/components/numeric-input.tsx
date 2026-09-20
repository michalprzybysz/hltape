"use client";

import { Input } from "@hltape/ui/components/input";
import { cn } from "@hltape/ui/lib/utils";
import type * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";

type NumericInputProps = Omit<NumericFormatProps, "customInput"> &
  React.ComponentProps<typeof Input>;

function NumericInput({ className, ...props }: NumericInputProps) {
  return <NumericFormat customInput={Input} className={cn(className)} {...props} />;
}

function NumericInputGroupInput({ className, ...props }: NumericInputProps) {
  return (
    <NumericFormat
      customInput={Input}
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { NumericInput, NumericInputGroupInput };
