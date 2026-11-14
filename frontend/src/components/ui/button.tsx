import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#F81B00]/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#F81B00] text-white hover:bg-[#D91700] active:bg-[#BF1500] shadow-xs",
        dark:
          "bg-[#111111] text-white hover:bg-[#222222] active:bg-[#000000] shadow-xs",
        secondary:
          "bg-[#ECEEF2] text-[#111111] hover:bg-[#E0E3E8] active:bg-[#D5D9E0] border border-[#E2E5EB]",
        outline:
          "border border-[#E2E5EB] bg-white text-[#111111] hover:bg-[#F5F6F8] active:bg-[#ECEEF2]",
        ghost:
          "text-[#111111] hover:bg-[#ECEEF2]",
        destructive:
          "bg-red-50 text-[#F81B00] hover:bg-red-100",
        link:
          "text-[#F81B00] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-xl",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
