import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-zs-blue-900 text-white shadow-sm hover:bg-zs-blue-800 active:bg-zs-blue-950",
        destructive:
          "bg-zs-red-600 text-white shadow-sm hover:bg-zs-red-700 active:bg-zs-red-800",
        outline:
          "border border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
        secondary:
          "bg-zs-surface text-zs-ink hover:bg-slate-200",
        ghost: "text-zs-ink hover:bg-zs-surface",
        link: "text-zs-blue-700 underline-offset-4 hover:underline",
        whatsapp:
          "bg-[#25D366] text-white shadow-sm hover:bg-[#1ebe57] active:bg-[#179649]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
