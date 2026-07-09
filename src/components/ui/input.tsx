import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text placeholder:text-text-secondary focus-gold",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
