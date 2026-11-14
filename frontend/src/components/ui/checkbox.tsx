"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { HiCheck } from "react-icons/hi2"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4.5 shrink-0 rounded border border-[#D1D5DB] bg-white transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#F81B00]/30 focus-visible:border-[#F81B00]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-checked:bg-[#111111] data-checked:border-[#111111] data-checked:text-white flex items-center justify-center cursor-pointer",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <HiCheck className="size-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
