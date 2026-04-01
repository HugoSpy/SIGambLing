import * as React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-brand-text">{label}</span> : null}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-brand-line bg-white/5 px-4 py-3 text-sm text-brand-text outline-none transition-all duration-300 placeholder:text-brand-muted focus:border-brand-cyan/50 focus:bg-white/10",
          error ? "border-red-400/70" : "",
          className,
        )}
        id={id}
        {...props}
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </label>
  ),
);

Input.displayName = "Input";
