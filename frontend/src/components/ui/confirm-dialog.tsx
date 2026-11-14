"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "emerald" | "outline"
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl text-xs font-bold"
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-[#F81B00] hover:bg-[#d61700] text-white rounded-xl text-xs font-bold"
                : variant === "emerald"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                : variant === "outline"
                ? "border border-[#E2E5EB] bg-white text-[#111111] hover:bg-[#F5F6F8] rounded-xl text-xs font-bold"
                : "bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-xs font-bold"
            }
          >
            {loading ? "Обработка..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
