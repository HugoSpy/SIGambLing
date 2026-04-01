import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/70 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-cta-gradient text-slate-950 shadow-glow hover:scale-[1.02] hover:shadow-glow-orange",
        secondary:
          "glass-panel text-brand-text hover:scale-[1.02] hover:border-brand-cyan/40",
        danger:
          "bg-red-500/90 text-white shadow-lg shadow-red-950/30 hover:scale-[1.02] hover:bg-red-400",
      },
      size: {
        default: "h-12 px-5 text-sm",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-6 text-base",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      type={type}
      {...props}
    />
  );
}
