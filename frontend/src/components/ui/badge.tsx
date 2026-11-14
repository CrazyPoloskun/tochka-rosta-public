import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors select-none [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-[#F81B00] text-white dark:bg-[#FF2E14]",
        destructive:
          "bg-red-600 text-white",
        dark:
          "bg-[#111111] text-white dark:bg-[#27272A]",
        secondary:
          "bg-[#ECEEF2] text-[#111111] dark:bg-[#27272A] dark:text-[#FAFAFA]",
        soft:
          "bg-[#F81B00]/10 text-[#F81B00] dark:bg-[#FF2E14]/15 dark:text-[#FF2E14]",
        outline:
          "border border-[#E2E5EB] bg-transparent text-[#111111] dark:border-[#27272A] dark:text-[#FAFAFA]",
        ai:
          "bg-[#F81B00]/12 text-[#F81B00] dark:bg-[#FF2E14]/18 dark:text-[#FF2E14] font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
