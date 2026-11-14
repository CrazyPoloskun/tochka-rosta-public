"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  delay?: number // in milliseconds
  direction?: "down" | "up" | "fade"
  distance?: number // in pixels
  duration?: number // in milliseconds
  threshold?: number
  once?: boolean
  as?: React.ElementType
}

/**
 * ScrollReveal: плавно спускает и проявляет элементы при попадании во вьюпорт
 * Оптимизировано для 60fps (только opacity и transform, без перерисовок)
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "down",
  distance = 16,
  duration = 480,
  threshold = 0.12,
  once = true,
  as: Component = "div",
  style,
  ...props
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // Fallback if IntersectionObserver is unavailable
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.unobserve(el)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [threshold, once])

  const transformStyle = isVisible
    ? "translateY(0)"
    : direction === "down"
    ? `translateY(-${distance}px)`
    : direction === "up"
    ? `translateY(${distance}px)`
    : "translateY(0)"

  return (
    <Component
      ref={ref}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: transformStyle,
        transitionProperty: "opacity, transform",
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Component>
  )
}
