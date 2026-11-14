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
