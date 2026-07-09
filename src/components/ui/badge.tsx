import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-background-secondary text-text-secondary",
      primary: "bg-primary/15 text-primary-light",
      success: "bg-success/15 text-success",
      danger: "bg-danger/15 text-danger",
      warning: "bg-warning/15 text-warning",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
