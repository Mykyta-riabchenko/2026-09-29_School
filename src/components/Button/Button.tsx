import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

// Shared button component (style doc §9). Visual roles map to the
// `.button*` BEM classes in styles/components/button.css — never
// hard-code colours or spacing here (style doc §38).
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sizeClass = size === "sm" ? "button--sm" : size === "lg" ? "button--lg" : "";
  const blockClass = block ? "button--block" : "";
  return (
    <button
      type="button"
      data-variant={variant}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={`button button--${variant} ${sizeClass} ${blockClass} ${className}`.trim().replace(/\s+/g, " ")}
      {...rest}
    >
      {loading ? (
        <span className="button__loader" aria-hidden="true" />
      ) : null}
      <span>{loading ? "Loading…" : children}</span>
    </button>
  );
}
