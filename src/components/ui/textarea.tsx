import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-text-secondary focus-gold",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
