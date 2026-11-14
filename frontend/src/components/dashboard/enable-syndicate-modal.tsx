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
        success("Коллективное соинвестирование открыто! Другие инвесторы могут войти со своими долями.", "Сбор открыт")
        onSuccess()
        onOpenChange(false)
      } else {
        const errData = await res.json().catch(() => ({}))
        error(errData.detail || "Не удалось открыть коллективное соинвестирование", "Ошибка")
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
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <HiOutlineUserGroup className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-[#111111]">
                Открыть коллективное соинвестирование
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Привлечение соинвесторов с долевым финансированием эскроу
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleEnable} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-950 leading-relaxed">
            Вы станете организатором коллективного пула сделки #{project.id}. Другие участники платформы смогут внести средства в пул, пропорционально разделив будущие роялти или права на разработку.
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#111111] block mb-1">
              Целевой объём софинансирования в рублях:
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
              Минимальный взнос для одного соинвестора в рублях:
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

          <DialogFooter className="gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl border-[#E2E5EB] px-4 cursor-pointer"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer px-4.5 h-9 flex items-center gap-1.5"
            >
              <HiOutlineSparkles className="size-4" />
              <span>{submitting ? "Активация..." : "Открыть сбор соинвестиций"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
