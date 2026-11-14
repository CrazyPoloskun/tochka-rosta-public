"use client"

import * as React from "react"

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[#E2E5EB]/70 rounded-xl ${className}`}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3.5 bg-white border border-[#E2E5EB] rounded-2xl animate-pulse space-x-4"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="size-8 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 max-w-sm">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-2.5 w-1/2 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-4 w-20 rounded-md shrink-0" />
          <Skeleton className="h-7 w-24 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white border border-[#E2E5EB] rounded-2xl space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-4/5 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-5/6 rounded-md" />
          </div>
          <div className="pt-3 border-t border-[#F1F3F5] flex items-center justify-between">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}


export function AiShineSkeleton({
  title = "Нейросетевая обработка данных",
  subtitle = "Используются модели OpenRouter и нормативная база трансфера технологий",
  className = "",
}: {
  title?: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`border border-[#E2E5EB] bg-white rounded-2xl p-5 shadow-xs animate-in fade-in duration-200 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E5EB]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#111111] opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-[#111111]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              {title}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5F6F8] text-[#4B5563] border border-[#E2E5EB] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#111111] animate-pulse" />
            AI Engine
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#111111] w-2/3 animate-pulse" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-3 w-4/5 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-3 w-full rounded-md bg-slate-100 animate-pulse" />
            <div className="h-3 w-2/3 rounded-md bg-slate-100 animate-pulse" />
          </div>
        </div>

        {subtitle && (
          <div className="pt-1 text-center text-[10px] text-[#6B7280]">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
