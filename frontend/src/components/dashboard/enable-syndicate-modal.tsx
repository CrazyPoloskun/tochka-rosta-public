"use client"

import * as React from "react"
import {
  HiOutlineUserGroup,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineCurrencyDollar,
} from "react-icons/hi2"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { Project } from "./dashboard-types"

interface EnableSyndicateModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
}

export function EnableSyndicateModal({
  project,
  open,
  onOpenChange,
  onSuccess,
  authFetch,
}: EnableSyndicateModalProps) {
  const { error, success } = useToast()

  const [minDeposit, setMinDeposit] = React.useState("50000")
  const [softCap, setSoftCap] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (project && open) {
      setSoftCap(String(project.total_budget || 2000000))
    }
  }, [project, open])

  if (!project) return null

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedMin = Number(minDeposit) || 10000
    const parsedSoftCap = Number(softCap) || Number(project.total_budget)

    if (parsedMin < 10000) {
      error("Минимальный взнос соинвестора не может быть меньше 10 000 ₽", "Ошибка")
      return
    }

    if (parsedSoftCap < parsedMin) {
      error("Целевой объем софинансирования должен быть больше минимального взноса", "Ошибка")
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/syndicate/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syndication_min_deposit: parsedMin,
          syndication_soft_cap: parsedSoftCap,
        }),
      })

      if (res.ok) {
        success("Сделка переведена в статус синдиката! Другие инвесторы могут войти со своими долями.", "Синдикация открыта")
        onSuccess()
        onOpenChange(false)
      } else {
        const errData = await res.json().catch(() => ({}))
        error(errData.detail || "Не удалось перевести сделку в формат синдиката", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при выполнении операции", "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-6 border-[#E2E5EB] shadow-xl">
        <DialogHeader className="border-b border-[#E2E5EB] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#F81B00]/10 text-[#F81B00]">
              <HiOutlineUserGroup className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-[#111111]">
                Открыть синдикацию проекта
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Привлечение соинвесторов с долевым финансированием эскроу
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleEnable} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-[#F5F6F8] rounded-xl text-[#374151] leading-relaxed">
            Вы станете <strong>Лид-инвестором</strong> сделки #{project.id}. Другие участники платформы смогут внести средства в пул, пропорционально разделив будущие роялти или права на патент.
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#111111] block mb-1">
              Целевой объем софинансирования (Soft Cap, ₽):
            </label>
            <Input
              type="number"
              value={softCap}
              onChange={(e) => setSoftCap(e.target.value)}
              placeholder={String(project.total_budget)}
              className="h-9 text-xs rounded-xl"
              required
            />
            <span className="text-[10px] text-[#6B7280] mt-1 block">
              Общий бюджет разработки: <strong>{Number(project.total_budget).toLocaleString("ru-RU")} ₽</strong>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#111111] block mb-1">
              Минимальный порог входа для одного соинвестора (₽):
            </label>
            <Input
              type="number"
              value={minDeposit}
              onChange={(e) => setMinDeposit(e.target.value)}
              min={10000}
              step={10000}
              placeholder="50000"
              className="h-9 text-xs rounded-xl"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl border-[#E2E5EB]"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
            >
              {submitting ? "Активация..." : "Открыть клубный сбор"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
