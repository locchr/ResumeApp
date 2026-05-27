import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-slate-700 text-slate-200 border-slate-600",
        success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        muted: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
