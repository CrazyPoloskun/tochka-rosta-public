"use client"

import * as React from "react"
import {
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCalculator,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { Project, ProfitPreviewData, ProfitDistributionHistoryItem } from "./dashboard-types"

interface ProfitDistributionModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function ProfitDistributionModal({
  project,
  open,
  onOpenChange,
  onSuccess,
  authFetch,
}: ProfitDistributionModalProps) {
  const { success, error } = useToast()

  const [activeTab, setActiveTab] = React.useState<"calculate" | "history">("calculate")
  const [profitAmount, setProfitAmount] = React.useState<string>("")
  const [profitDescription, setProfitDescription] = React.useState<string>(
    "Выплата инвестиционного дохода по лицензионному договору"
  )
  const [calculating, setCalculating] = React.useState(false)
  const [distributing, setDistributing] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<ProfitPreviewData | null>(null)

  const [history, setHistory] = React.useState<ProfitDistributionHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(false)

  // Сброс при открытии
  React.useEffect(() => {
    if (open && project) {
      setPreviewData(null)
      setProfitAmount("")
      if (activeTab === "history") {
        fetchHistory()
      }
    }
  }, [open, project, activeTab])

  const fetchHistory = async () => {
    if (!project) return
    setLoadingHistory(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/profit/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  // Расчет долей
  const handleCalculatePreview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !profitAmount || Number(profitAmount) <= 0) return

    setCalculating(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/profit/calculate-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(profitAmount),
          description: profitDescription.trim(),
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || "Не удалось рассчитать доли распределения")
      }

      const data: ProfitPreviewData = await res.json()
      setPreviewData(data)
    } catch (err: any) {
      error(err.message || "Ошибка расчета", "Ошибка")
    } finally {
      setCalculating(false)
    }
  }

  // Фактическое распределение
  const handleConfirmDistribution = async () => {
    if (!project || !profitAmount || Number(profitAmount) <= 0 || distributing) return

    setDistributing(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/profit/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(profitAmount),
          description: profitDescription.trim(),
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || "Ошибка при выплате прибыли")
      }

      success(
        `Прибыль в размере ${Number(profitAmount).toLocaleString("ru-RU")} ₽ успешно распределена и начислена на кошельки соинвесторов!`,
        "Выплата завершена"
      )
      onSuccess()
      setPreviewData(null)
      setActiveTab("history")
      fetchHistory()
    } catch (err: any) {
      error(err.message || "Не удалось распределить прибыль", "Ошибка")
    } finally {
      setDistributing(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 bg-white border-[#E2E5EB] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#E2E5EB]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineBanknotes className="size-5 text-[#F81B00]" />
              <span>Распределение прибыли проекта</span>
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB] bg-slate-50">
              Проект #{project.id}
            </Badge>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            {project.title} • Пропорциональное начисление дивидендов соинвесторам
          </p>

          {/* Subtabs */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("calculate")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === "calculate"
                  ? "bg-[#111111] text-white"
                  : "bg-[#F5F6F8] text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              Новое начисление
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history")
                fetchHistory()
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#111111] text-white"
                  : "bg-[#F5F6F8] text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              История выплат
            </button>
          </div>
        </DialogHeader>

        {activeTab === "calculate" ? (
          <div className="space-y-4 py-2">
            <form onSubmit={handleCalculatePreview} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111]">Сумма прибыли к распределению (₽)</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                    placeholder="Например, 1000000"
                    className="h-10 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111]">Основание выплаты</label>
                  <Input
                    value={profitDescription}
                    onChange={(e) => setProfitDescription(e.target.value)}
                    placeholder="Назначение платежа..."
                    className="h-10 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={calculating || !profitAmount || Number(profitAmount) <= 0}
                  className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl h-9 gap-1.5"
                >
                  <HiOutlineCalculator className="size-4 text-[#F81B00]" />
                  <span>{calculating ? "Расчёт..." : "Рассчитать пропорциональные доли"}</span>
                </Button>
              </div>
            </form>

            {/* Preview Results Table */}
            {previewData && (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E5EB]">
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">Предварительный расчёт начислений</h4>
                    <p className="text-[10px] text-[#6B7280]">
                      Общий пул: <strong>{Number(previewData.total_profit).toLocaleString("ru-RU")} ₽</strong> • Всего инвесторов: <strong>{previewData.investors_count}</strong>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    Готово к проводке
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E5EB] text-[10px] uppercase font-bold text-[#6B7280]">
                        <th className="pb-2">Инвестор</th>
                        <th className="pb-2 text-right">Вложено (₽)</th>
                        <th className="pb-2 text-right">Доля (%)</th>
                        <th className="pb-2 text-right text-[#111111]">К начислению (₽)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E5EB]/60">
                      {previewData.items.map((item) => (
                        <tr key={item.investor_id} className="hover:bg-white/50">
                          <td className="py-2.5">
                            <span className="font-bold text-[#111111] block">
                              {item.organization_name || item.investor_name}
                            </span>
                            {item.organization_name && (
                              <span className="text-[10px] text-[#6B7280] block">{item.investor_name}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono text-[#6B7280]">
                            {Number(item.invested_amount).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-amber-800">
                            {Number(item.share_percent).toFixed(2)}%
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-600 text-sm">
                            +{Number(item.payout_amount).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-[#E2E5EB] flex items-center justify-between">
                  <span className="text-[11px] text-[#6B7280]">
                    Средства будут мгновенно зачислены на баланс каждого инвестора
                  </span>
                  <Button
                    type="button"
                    onClick={handleConfirmDistribution}
                    disabled={distributing}
                    className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl h-9 px-4 gap-1.5 shadow-xs"
                  >
                    <HiOutlineCheckCircle className="size-4" />
                    <span>{distributing ? "Зачисление средств..." : "Подтвердить и перевести деньги"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="py-2 space-y-3">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-[#6B7280]">Загрузка истории выплат...</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF] bg-[#F8FAFC] rounded-2xl border border-[#E2E5EB]">
                История выплат пуста. По данному проекту ещё не производилось распределение прибыли.
              </div>
            ) : (
              history.map((dist) => (
                <div
                  key={dist.id}
                  className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#111111] block">{dist.description}</span>
                      <span className="text-[10px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                        <HiOutlineClock className="size-3" />
                        {new Date(dist.distribution_date).toLocaleString("ru-RU")} • Инициатор: {dist.initiator_name || "Система"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                      +{Number(dist.total_amount).toLocaleString("ru-RU")} ₽
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-[#E2E5EB] divide-y divide-[#E2E5EB]/40 text-xs">
                    {dist.items.map((item) => (
                      <div key={item.id} className="py-1.5 flex items-center justify-between">
                        <span className="text-[#111111] font-medium truncate max-w-[250px]">
                          {item.organization_name || item.investor_name} ({Number(item.share_percent).toFixed(2)}%)
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          +{Number(item.payout_amount).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
