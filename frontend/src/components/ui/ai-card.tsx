import * as React from "react"
import { cn } from "@/lib/utils"

interface AiCardProps extends React.ComponentProps<"div"> {
  innerClassName?: string
}

function AiCard({
  className,
  innerClassName,
  children,
  ...props
}: AiCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xs transition-all",
        className
      )}
      {...props}
    >
      <div className={cn("w-full h-full", innerClassName)}>
        {children}
      </div>
    </div>
  )
}

interface AiButtonProps extends React.ComponentProps<"button"> {
  innerClassName?: string
}

function AiButton({
  className,
  innerClassName,
  children,
  ...props
}: AiButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "ai-button-track group inline-flex cursor-pointer transition-all active:scale-[0.98] outline-none",
        className
      )}
      {...props}
    >
      {/* Две полоски, бегущие по контуру кнопки */}
      <div className="ai-two-beams-spinner" />
      
      {/* Внутренняя поверхность кнопки: чистый цвет без градиента при наведении */}
      <div
        className={cn(
          "ai-button-inner px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2",
          innerClassName
        )}
      >
        {children}
      </div>
    </button>
  )
}

export { AiCard, AiButton }
