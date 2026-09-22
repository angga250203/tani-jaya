"use client";

import type { ComponentProps } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type FormInputProps<TValues extends FieldValues> = Omit<
  ComponentProps<typeof Input>,
  "name"
> & {
  name: Path<TValues>;
  label: string;
  hint?: string;
};

export function FormInput<TValues extends FieldValues>({
  className,
  name,
  label,
  hint,
  id,
  ...props
}: FormInputProps<TValues>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<TValues>();
  const error = errors[name]?.message;
  const inputId = id ?? String(name);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-tj-text" htmlFor={inputId}>
        {label}
      </label>
      <Input
        aria-describedby={hint || error ? `${inputId}-description` : undefined}
        aria-invalid={Boolean(error)}
        className={cn(error && "border-tj-danger", className)}
        id={inputId}
        {...register(name)}
        {...props}
      />
      {(hint || error) && (
        <p
          className={cn("text-xs text-tj-muted", error && "text-tj-danger")}
          id={`${inputId}-description`}
        >
          {error ? String(error) : hint}
        </p>
      )}
    </div>
  );
}
