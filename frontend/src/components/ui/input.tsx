import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-[#E2E5EB] bg-[#F5F6F8] px-3 py-2 text-sm text-[#111111] transition-all outline-none placeholder:text-[#6B7280]",
        "focus-visible:bg-white focus-visible:border-[#F81B00] focus-visible:ring-2 focus-visible:ring-[#F81B00]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#FAFAFA] dark:placeholder:text-[#A1A1AA] dark:focus-visible:bg-[#18181B] dark:focus-visible:border-[#FF2E14] dark:focus-visible:ring-[#FF2E14]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
