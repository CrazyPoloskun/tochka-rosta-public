"use client"

import * as React from "react"
import {
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineCommandLine,
} from "react-icons/hi2"
import { cn } from "@/lib/utils"

/* ==============================================================================
   1. AI MARKER (Маркер статуса вместо крутящегося спиннера)
   ============================================================================== */

export interface AiMarkerProps {
  className?: string
  active?: boolean
  variant?: "neutral" | "primary" | "emerald" | "amber"
  size?: "sm" | "md" | "lg"
}

export function AiMarker({
  className,
  active = true,
  variant = "neutral",
  size = "md",
}: AiMarkerProps) {
  const sizeMap = {
    sm: "size-2",
    md: "size-2.5",
    lg: "size-3",
  }

  const colorMap = {
    neutral: {
      bg: "bg-[#111111]",
      ping: "bg-[#111111]",
    },
    primary: {
      bg: "bg-[#F81B00]",
      ping: "bg-[#F81B00]",
    },
    emerald: {
      bg: "bg-emerald-600",
      ping: "bg-emerald-500",
    },
    amber: {
      bg: "bg-amber-600",
      ping: "bg-amber-500",
    },
  }

  const currentSize = sizeMap[size]
  const currentColor = colorMap[variant]

  return (
    <span className={cn("relative inline-flex items-center justify-center shrink-0", currentSize, className)}>
      {active && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            currentColor.ping
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full", currentSize, currentColor.bg)} />
    </span>
  )
}

/* ==============================================================================
   2. SUGGESTIONS & SUGGESTION (Подсказки для ИИ-ввода)
   ============================================================================== */

export interface SuggestionsProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
}

export function Suggestions({ className, children, label, ...props }: SuggestionsProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-[#9CA3AF]">Кликните для выбора</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
        {children}
      </div>
    </div>
  )
}

export interface SuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  icon?: React.ReactNode
  onSelect?: () => void
}

export function Suggestion({
  className,
  children,
  icon,
  onClick,
  onSelect,
  ...props
}: SuggestionProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onClick) onClick(e)
        if (onSelect) onSelect()
      }}
      className={cn(
        "inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl border border-[#E2E5EB] bg-white text-xs font-medium text-[#374151] hover:text-[#111111] hover:border-[#111111] hover:bg-[#F8FAFC] transition-all cursor-pointer shadow-2xs active:scale-[0.98] outline-none",
        className
      )}
      {...props}
    >
      {icon || <HiOutlineSparkles className="size-3 text-[#F81B00] shrink-0" />}
      <span className="truncate max-w-[320px]">{children}</span>
    </button>
  )
}

/* ==============================================================================
   3. CHAIN OF THOUGHT (Цепочка рассуждений модели)
   ============================================================================== */

export interface ChainStep {
  id: string | number
  title: string
  detail?: string
  status: "pending" | "running" | "completed" | "error"
  duration?: string
  icon?: string
}

export interface ChainOfThoughtProps {
  steps: ChainStep[]
  currentStepIndex?: number
  running?: boolean
  title?: string
  defaultOpen?: boolean
  className?: string
}

export function ChainOfThought({
  steps,
  currentStepIndex = 0,
  running = false,
  title,
  defaultOpen = true,
  className,
}: ChainOfThoughtProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  // При запуске автоматически держим открытым
  React.useEffect(() => {
    if (running) {
      setIsOpen(true)
    }
  }, [running])

  const completedCount = steps.filter((s) => s.status === "completed").length
  const totalCount = steps.length

  const headerTitle =
    title ||
    (running
      ? `Ход рассуждений (шаг ${Math.min(currentStepIndex + 1, totalCount)} из ${totalCount})`
      : `Рассмотрено в ${totalCount} шагов`)

  return (
    <div
      className={cn(
        "border border-[#E2E5EB] rounded-2xl bg-white overflow-hidden transition-all shadow-xs",
        className
      )}
    >
      {/* Collapsible Trigger / Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer outline-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {running ? (
            <AiMarker variant="primary" size="md" />
          ) : (
            <span className="size-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="size-3 stroke-[2.5]" />
            </span>
          )}

          <div className="min-w-0">
            <span className="text-xs font-bold text-[#111111] block truncate">
              {headerTitle}
            </span>
            <span className="text-[10px] text-[#6B7280] block">
              {running
                ? "Модель строит логическую цепочку решения задачи..."
                : `Завершено успешно • ${completedCount} из ${totalCount} проверок пройдено`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-[#F5F6F8] border border-[#E2E5EB] text-[#4B5563]">
            {running ? `${Math.round(((currentStepIndex + 1) / totalCount) * 100)}%` : "ГОСТ 15.016"}
          </span>
          <HiOutlineChevronDown
            className={cn(
              "size-4 text-[#888888] transition-transform duration-200",
              isOpen ? "rotate-180" : ""
            )}
          />
        </div>
      </button>

      {/* Collapsible Step-by-Step Trace Content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-[#E2E5EB]/60 bg-[#FAFAFB]">
          <div className="relative pl-6 space-y-3 pt-3">
            {/* Вертикальная направляющая линия (Trace Line) */}
            <div className="absolute left-2.5 top-5 bottom-4 w-0.5 bg-[#E2E5EB]" />

            {steps.map((step, idx) => {
              const isCurrent = running && idx === currentStepIndex
              const isDone = step.status === "completed" || (!running && idx <= currentStepIndex)
              const isPending = !isDone && !isCurrent

              return (
                <div key={step.id} className="relative flex items-start gap-3 text-xs">
                  {/* Иконка / маркер текущего шага на линии */}
                  <div className="absolute -left-6 top-0.5 flex items-center justify-center">
                    {isCurrent ? (
                      <span className="size-5 rounded-full bg-white border-2 border-[#111111] flex items-center justify-center shadow-xs">
                        <AiMarker variant="primary" size="sm" />
                      </span>
                    ) : isDone ? (
                      <span className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                        <HiOutlineCheck className="size-3 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span className="size-5 rounded-full bg-white border border-[#D1D5DB] flex items-center justify-center">
                        <span className="size-1.5 rounded-full bg-[#9CA3AF]" />
                      </span>
                    )}
                  </div>

                  {/* Описание шага */}
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-semibold",
                          isCurrent
                            ? "text-[#111111] font-bold"
                            : isDone
                            ? "text-[#1F2937]"
                            : "text-[#9CA3AF]"
                        )}
                      >
                        {step.title}
                      </span>
                      {step.duration && (
                        <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0">
                          {step.duration}
                        </span>
                      )}
                    </div>

                    {step.detail && (
                      <p
                        className={cn(
                          "text-[11px] mt-0.5 leading-relaxed",
                          isCurrent
                            ? "text-[#4B5563]"
                            : isDone
                            ? "text-[#6B7280]"
                            : "text-[#9CA3AF]"
                        )}
                      >
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
