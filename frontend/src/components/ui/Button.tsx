import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "interactive-hover inline-flex items-center justify-center font-semibold focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary:   "btn-primary",
        secondary: "btn-secondary",
        danger:    "btn-danger",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm:      "h-9 px-3 text-sm",
        lg:      "h-12 px-5 text-base",
      },
      fullWidth: {
        true:  "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant:   "primary",
      size:      "default",
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
