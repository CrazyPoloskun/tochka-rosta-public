"use client"

import * as React from "react"
import { HiOutlineDocumentDuplicate, HiOutlineCheck } from "react-icons/hi2"

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
  title?: string
}

export function CopyButton({ text, label, className = "", title = "Копировать" }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Скопировано в буфер" : title}
      className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
        copied
          ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md"
          : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8] px-1.5 py-0.5 rounded-md"
      } ${className}`}
    >
      {copied ? (
        <>
          <HiOutlineCheck className="size-3 text-emerald-600 shrink-0" />
          <span>Скопировано</span>
        </>
      ) : (
        <>
          <HiOutlineDocumentDuplicate className="size-3 shrink-0" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  )
}
