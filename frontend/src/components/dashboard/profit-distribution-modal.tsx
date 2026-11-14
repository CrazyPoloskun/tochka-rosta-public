"use client"

import * as React from "react"
import {
  HiOutlineBanknotes,
  HiOutlineArrowTrendingUp,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineArrowPath,
  HiOutlineInformationCircle,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

// Палитра контрастных гармоничных цветов для сегментов долей участников
const SHARE_COLORS = [
  { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50", border: "border-emerald-200" },
  { bg: "bg-sky-500", text: "text-sky-700", light: "bg-sky-50", border: "border-sky-200" },
  { bg: "bg-indigo-500", text: "text-indigo-700", light: "bg-indigo-50", border: "border-indigo-200" },
  { bg: "bg-amber-500", text: "text-amber-800", light: "bg-amber-50", border: "border-amber-200" },
  { bg: "bg-violet-500", text: "text-violet-700", light: "bg-violet-50", border: "border-violet-200" },
  { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-50", border: "border-rose-200" },
  { bg: "bg-teal-500", text: "text-teal-700", light: "bg-teal-50", border: "border-teal-200" },
]

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

  // Базовый расчет с сервера
  const fetchCalculatePreview = React.useCallback(
    async (amount: number, desc?: string) => {
      if (!project || amount <= 0) return
      setCalculating(true)
      try {
        const res = await authFetch(`/api/v1/projects/${project.id}/profit/calculate-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description: (desc || profitDescription).trim(),
          }),
        })

        if (!res.ok) {
          setPreviewData({
            project_id: project.id,
            project_title: project.title,
            total_profit: amount,
            total_invested: 0,
            investors_count: 0,
            items: [],
          })
          return
        }

        const data: ProfitPreviewData = await res.json()
        setPreviewData(data)
      } catch {
        setPreviewData({
          project_id: project.id,
          project_title: project.title,
          total_profit: amount,
          total_invested: 0,
          investors_count: 0,
          items: [],
        })
      } finally {
        setCalculating(false)
      }
    },
    [project, profitDescription, authFetch]
  )

  // Автоматический запуск при открытии модального окна без участия пользователя
  React.useEffect(() => {
    if (open && project) {
      // Инициализируем сумму автоматически: берем общий бюджет проекта или стандартную сумму
      const defaultAmount =
        project.total_budget && Number(project.total_budget) > 0
          ? String(project.total_budget)
          : "1000000"

      setProfitAmount(defaultAmount)
      fetchCalculatePreview(Number(defaultAmount))

      if (activeTab === "history") {
        fetchHistory()
      }
    }
  }, [open, project])

  // Автоматический перерасчет при вводе с дебаунсом (без необходимости нажимать кнопки)
  React.useEffect(() => {
    if (!open || !project) return
    const numericAmount = Number(profitAmount)
    if (!numericAmount || numericAmount <= 0) return

    // Мгновенный оптимистичный перерасчет на клиенте для плавности интерфейса
    if (previewData && previewData.items.length > 0) {
      const updatedItems = previewData.items.map((item) => {
        const shareRatio = Number(item.share_percent) / 100
        return {
          ...item,
          payout_amount: Math.round(numericAmount * shareRatio * 100) / 100,
        }
      })
      setPreviewData({
        ...previewData,
        total_profit: numericAmount,
        items: updatedItems,
      })
    }

    // Дебаунс синхронизации с сервером
    const timer = setTimeout(() => {
      fetchCalculatePreview(numericAmount)
    }, 350)

    return () => clearTimeout(timer)
  }, [profitAmount, open, project])

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
        `Прибыль в размере ${Number(profitAmount).toLocaleString("ru-RU")} ₽ успешно распределена и начислена на счета участников!`,
        "Выплата завершена"
      )
      onSuccess()
      setActiveTab("history")
      fetchHistory()
    } catch (err: any) {
      error(err.message || "Не удалось распределить прибыль", "Ошибка")
    } finally {
      setDistributing(false)
    }
  }

  // Быстрые пресеты для удобства
  const handleSelectPreset = (value: number) => {
    setProfitAmount(String(value))
  }

  if (!project) return null

  const projectBudget = Number(project.total_budget || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-2xl p-5 bg-white border-[#E2E5EB] shadow-2xl">
        <DialogHeader className="pb-3 border-b border-[#E2E5EB]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-[#F81B00]/10 text-[#F81B00] shrink-0">
                <HiOutlineBanknotes className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-[#111111] tracking-tight">
                  Распределение инвестиционной прибыли и роялти
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280]">
                  Сделка #{project.id}: «{project.title}» • Пропорциональное начисление дивидендов
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-bold border-[#E2E5EB] bg-[#F8FAFC]">
              Проект #{project.id}
            </Badge>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-2 pt-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("calculate")}
              className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "calculate"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "bg-[#F5F6F8] text-[#6B7280] hover:text-[#111111] hover:bg-[#ECEEF2]"
              }`}
            >
              Расчёт и распределение
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("history")
                fetchHistory()
              }}
              className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "bg-[#F5F6F8] text-[#6B7280] hover:text-[#111111] hover:bg-[#ECEEF2]"
              }`}
            >
              История выплат {history.length > 0 && `(${history.length})`}
            </button>
          </div>
        </DialogHeader>

        {activeTab === "calculate" ? (
          <div className="space-y-3 pt-3">
            {/* Input params + presets */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-[#111111]">Сумма к распределению (₽)</label>
                    {calculating && (
                      <span className="text-[10px] text-[#6B7280] flex items-center gap-1">
                        <HiOutlineArrowPath className="size-3 animate-spin text-[#F81B00]" />
                        Расчёт...
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="1000"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                    placeholder="Например, 1000000"
                    className="h-9 text-xs rounded-lg bg-white border-[#E2E5EB] font-mono font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111]">Основание выплаты</label>
                  <Input
                    value={profitDescription}
                    onChange={(e) => setProfitDescription(e.target.value)}
                    placeholder="Назначение платежа..."
                    className="h-9 text-xs rounded-lg bg-white border-[#E2E5EB]"
                    required
                  />
                </div>
              </div>

              {/* Quick presets inline */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] mr-1">Пресеты:</span>
                {projectBudget > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(Math.round(projectBudget * 0.25))}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-[#ECEEF2] text-[#374151] rounded border border-[#E2E5EB] cursor-pointer"
                    >
                      25% ({(Math.round(projectBudget * 0.25)).toLocaleString("ru-RU")} ₽)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(Math.round(projectBudget * 0.5))}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-[#ECEEF2] text-[#374151] rounded border border-[#E2E5EB] cursor-pointer"
                    >
                      50% ({(Math.round(projectBudget * 0.5)).toLocaleString("ru-RU")} ₽)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(projectBudget)}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-[#ECEEF2] text-[#374151] rounded border border-[#E2E5EB] cursor-pointer"
                    >
                      100% ({projectBudget.toLocaleString("ru-RU")} ₽)
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectPreset(500000)}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-[#ECEEF2] text-[#374151] rounded border border-[#E2E5EB] cursor-pointer"
                >
                  500 тыс. ₽
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(1000000)}
                  className="text-[10px] font-semibold px-2 py-0.5 bg-white hover:bg-[#ECEEF2] text-[#374151] rounded border border-[#E2E5EB] cursor-pointer"
                >
                  1 млн ₽
                </button>
              </div>
            </div>

            {/* Investors Table or Empty Notice */}
            {previewData && previewData.items.length > 0 ? (
              <div className="border border-[#E2E5EB] rounded-xl p-3 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#E2E5EB]">
                  <div className="flex items-center gap-1.5 font-bold text-[#111111]">
                    <HiOutlineSparkles className="size-3.5 text-[#F81B00]" />
                    <span>Сводка долей соинвесторов ({previewData.investors_count})</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6B7280]">
                    Пул: <strong className="text-[#111111]">{Number(previewData.total_invested).toLocaleString("ru-RU")} ₽</strong>
                  </span>
                </div>

                {/* Compact Table */}
                <div className="max-h-[180px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E5EB] text-[10px] uppercase font-bold text-[#6B7280]">
                        <th className="pb-1.5">Инвестор</th>
                        <th className="pb-1.5 text-right">Вложено</th>
                        <th className="pb-1.5 text-right">Доля в пуле</th>
                        <th className="pb-1.5 text-right text-[#111111]">К начислению</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E5EB]/50">
                      {previewData.items.map((item) => (
                        <tr key={item.investor_id} className="hover:bg-[#F8FAFC]">
                          <td className="py-1.5">
                            <span className="font-semibold text-[#111111] truncate block max-w-[220px]">
                              {item.organization_name || item.investor_name}
                            </span>
                          </td>
                          <td className="py-1.5 text-right font-mono text-[11px] text-[#6B7280]">
                            {Number(item.invested_amount).toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-amber-800 text-[11px]">
                            {Number(item.share_percent).toFixed(2)}%
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-emerald-600 text-xs">
                            +{Number(item.payout_amount).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center rounded-xl border border-dashed border-[#E2E5EB] bg-[#F8FAFC]">
                <HiOutlineInformationCircle className="size-5 text-[#6B7280] mx-auto mb-1" />
                <p className="text-xs font-semibold text-[#111111]">В данном проекте пока нет соинвесторов</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Распределение дивидендов станет доступно после привлечения инвестиций в сделку.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="py-2 space-y-2 max-h-[300px] overflow-y-auto">
            {loadingHistory ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">Загрузка истории выплат...</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#9CA3AF] bg-[#F8FAFC] rounded-xl border border-[#E2E5EB]">
                История выплат пуста. По данному проекту ещё не производилось распределение прибыли.
              </div>
            ) : (
              history.map((dist) => (
                <div
                  key={dist.id}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl space-y-2"
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

                  <div className="pt-1.5 border-t border-[#E2E5EB] divide-y divide-[#E2E5EB]/40 text-xs">
                    {dist.items.map((item) => (
                      <div key={item.id} className="py-1 flex items-center justify-between text-[11px]">
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

        {/* Modal Footer: NO "Закрыть" button! Only action button */}
        {activeTab === "calculate" && (
          <DialogFooter className="pt-3 border-t border-[#E2E5EB] mt-2 flex sm:justify-end items-center">
            <Button
              type="button"
              onClick={handleConfirmDistribution}
              disabled={
                distributing ||
                !previewData ||
                previewData.items.length === 0 ||
                !profitAmount ||
                Number(profitAmount) <= 0
              }
              className="w-full sm:w-auto text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl h-9 px-5 gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <HiOutlineCheckCircle className="size-4" />
              <span>
                {distributing
                  ? "Зачисление средств..."
                  : previewData && previewData.items.length === 0
                  ? "Нет инвесторов для выплаты"
                  : `Подтвердить и перевести ${Number(profitAmount || 0).toLocaleString("ru-RU")} ₽`}
              </span>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
