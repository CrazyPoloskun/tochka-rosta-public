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
                ? "Формирование логической цепочки решения задачи..."
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

/* ==============================================================================
   4. PLAN (План реализации / дорожная карта ИИ shadcn)
   ============================================================================== */

export interface PlanProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
}

export function Plan({ className, children, ...props }: PlanProps) {
  return (
    <div
      className={cn(
        "border border-[#E2E5EB] rounded-2xl bg-white overflow-hidden shadow-2xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PlanHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-4 border-b border-[#E2E5EB] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PlanTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-bold text-[#111111] flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function PlanDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-[#6B7280] mt-0.5", className)} {...props}>
      {children}
    </p>
  )
}

export function PlanContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 space-y-4", className)} {...props}>
      {children}
    </div>
  )
}

export function PlanSteps({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative pl-8 sm:pl-9 space-y-3 pt-1", className)} {...props}>
      <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-[#E2E5EB]" />
      {children}
    </div>
  )
}

export interface PlanStepItemProps extends React.HTMLAttributes<HTMLDivElement> {
  stepNumber: number | string
  title: string
  description?: string
  budget?: string | number
  duration?: string
  deliverables?: string[]
}

export function PlanStepItem({
  stepNumber,
  title,
  description,
  budget,
  duration,
  deliverables,
  className,
  ...props
}: PlanStepItemProps) {
  return (
    <div className={cn("relative flex items-start gap-3 text-xs", className)} {...props}>
      <div className="absolute -left-8 sm:-left-9 top-0.5 size-5 sm:size-6 rounded-full bg-[#111111] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
        {stepNumber}
      </div>
      <div className="flex-1 min-w-0 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl p-3 space-y-1.5 transition-all hover:border-[#111111]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <span className="font-bold text-[#111111] text-xs min-w-0 flex-1 break-words">
            {title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {budget !== undefined && (
              <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {typeof budget === "number" ? `${budget.toLocaleString("ru-RU")} ₽` : budget}
              </span>
            )}
            {duration && (
              <span className="text-[10px] text-[#6B7280] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E2E5EB]">
                {duration}
              </span>
            )}
          </div>
        </div>

        {description && (
          <p className="text-[11px] text-[#4B5563] leading-relaxed break-words">
            {description}
          </p>
        )}

        {deliverables && deliverables.length > 0 && (
          <div className="pt-1.5 mt-1 border-t border-[#E2E5EB]/60">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
              Результат этапа:
            </span>
            <ul className="space-y-0.5">
              {deliverables.map((del, dIdx) => (
                <li key={dIdx} className="text-[11px] text-[#374151] flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#F81B00] shrink-0" />
                  <span className="break-words">{del}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
