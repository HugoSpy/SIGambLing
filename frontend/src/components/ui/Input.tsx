import * as React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <label className="block space-y-2">
      {label ? (
        <span
          className="block"
          style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg-secondary)" }}
        >
          {label}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn("input-base", error ? "input-error" : "", className)}
        id={id}
        {...props}
      />
      {error ? (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--brand-red-hover)" }}>{error}</p>
      ) : null}
    </label>
  ),
);

Input.displayName = "Input";
