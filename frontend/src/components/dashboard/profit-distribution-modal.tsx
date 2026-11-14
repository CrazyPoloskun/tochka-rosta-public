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
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.detail || "Не удалось рассчитать доли распределения")
        }

        const data: ProfitPreviewData = await res.json()
        setPreviewData(data)
      } catch (err: any) {
        error(err.message || "Ошибка автоматического расчета", "Ошибка")
      } finally {
        setCalculating(false)
      }
    },
    [project, profitDescription, authFetch, error]
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
      <DialogContent className="sm:max-w-3xl rounded-2xl p-6 bg-white border-[#E2E5EB] max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="pb-4 border-b border-[#E2E5EB]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#F81B00]/10 text-[#F81B00] shrink-0">
                <HiOutlineBanknotes className="size-6" />
              </span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#111111] tracking-tight">
                  Распределение инвестиционной прибыли и роялти
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280] mt-0.5">
                  Сделка #{project.id}: «{project.title}» • Пропорциональное начисление дивидендов
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-bold border-[#E2E5EB] bg-[#F8FAFC]">
              Проект #{project.id}
            </Badge>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("calculate")}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
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
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
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
          <div className="space-y-5 py-2">
            {/* Live Auto-Calculation Status Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-600"></span>
                </span>
                <span className="font-semibold">
                  Автоматический расчёт дивидендов активен
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">
                Без ручных пересчётов: доли обновляются в реальном времени
              </span>
            </div>

            {/* СВОДКА О ТОМ, КАКОЙ ПРОЦЕНТ СЕЙЧАС ПОЛОЖЕН КАЖДОМУ УЧАСТНИКУ ПРОПОРЦИОНАЛЬНО ВЛОЖЕННОМУ */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E5EB]">
                <div>
                  <div className="flex items-center gap-2">
                    <HiOutlineSparkles className="size-4 text-[#F81B00]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                      Сводка причитающихся долей соинвесторов
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Какой процент сейчас положен каждому участнику пропорционально вложенному капиталу
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-[#6B7280]">Общий пул:</span>
                  <span className="font-mono font-bold text-[#111111] bg-white px-2 py-0.5 rounded-lg border border-[#E2E5EB]">
                    {previewData
                      ? Number(previewData.total_invested).toLocaleString("ru-RU") + " ₽"
                      : Number(project.total_budget || 0).toLocaleString("ru-RU") + " ₽"}
                  </span>
                </div>
              </div>

              {/* Визуальная сегментированная шкала долей (100% Equity Split Bar) */}
              {previewData && previewData.items.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-[#6B7280]">
                    <span>Пропорциональная структура владения пулом:</span>
                    <span className="font-semibold text-[#111111]">100% капитала</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    {previewData.items.map((item, idx) => {
                      const color = SHARE_COLORS[idx % SHARE_COLORS.length]
                      const pct = Number(item.share_percent)
                      return (
                        <div
                          key={item.investor_id}
                          className={`${color.bg} h-full border-r border-white/60 transition-all duration-300 relative group`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                          title={`${item.organization_name || item.investor_name}: ${pct.toFixed(2)}%`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Список долей участников */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {previewData && previewData.items.length > 0 ? (
                  previewData.items.map((item, idx) => {
                    const color = SHARE_COLORS[idx % SHARE_COLORS.length]
                    const pct = Number(item.share_percent)
                    return (
                      <div
                        key={item.investor_id}
                        className="p-3 bg-white border border-[#E2E5EB] rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-[#111111]/30 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`size-8 rounded-xl ${color.light} ${color.text} ${color.border} border flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            {(item.organization_name || item.investor_name || "Инвестор").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[#111111] truncate block">
                              {item.organization_name || item.investor_name}
                            </span>
                            <span className="text-[10px] text-[#6B7280] block">
                              Вложено: <strong>{Number(item.invested_amount).toLocaleString("ru-RU")} ₽</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black font-mono ${color.light} ${color.text} border ${color.border}`}
                          >
                            {pct.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-0.5">
                            +{Number(item.payout_amount).toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-2 p-4 text-center text-xs text-[#6B7280]">
                    {calculating ? "Расчёт пропорциональных долей..." : "Нет данных о соинвесторах проекта"}
                  </div>
                )}
              </div>
            </div>

            {/* Настройки распределяемой суммы */}
            <div className="p-4 bg-white border border-[#E2E5EB] rounded-2xl space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111111]">Параметры распределяемой прибыли</h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Сумма будет разделена строго по зафиксированным процентам выше
                  </p>
                </div>
                {calculating && (
                  <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                    <HiOutlineArrowPath className="size-3.5 animate-spin text-[#F81B00]" />
                    Пересчёт...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] flex items-center justify-between">
                    <span>Сумма к распределению (₽)</span>
                    <span className="text-[10px] text-[#6B7280] font-normal">автоматический пересчёт</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1000"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                    placeholder="Например, 1000000"
                    className="h-10 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB] font-mono font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
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

              {/* Быстрые пресеты сумм */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block mb-1.5">
                  Быстрый выбор суммы:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {projectBudget > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(Math.round(projectBudget * 0.25))}
                        className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                      >
                        25% бюджета ({(Math.round(projectBudget * 0.25)).toLocaleString("ru-RU")} ₽)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(Math.round(projectBudget * 0.5))}
                        className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                      >
                        50% бюджета ({(Math.round(projectBudget * 0.5)).toLocaleString("ru-RU")} ₽)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(projectBudget)}
                        className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                      >
                        100% бюджета ({projectBudget.toLocaleString("ru-RU")} ₽)
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(500000)}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                  >
                    500 тыс. ₽
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(1000000)}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                  >
                    1.0 млн ₽
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(2500000)}
                    className="text-[11px] font-semibold px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#374151] rounded-lg border border-[#E2E5EB] cursor-pointer transition-colors"
                  >
                    2.5 млн ₽
                  </button>
                </div>
              </div>
            </div>

            {/* Итоговая таблица ведомости начислений */}
            {previewData && (
              <div className="p-4 bg-white border border-[#E2E5EB] rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E5EB]">
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">
                      Ведомость распределения дивидендов
                    </h4>
                    <p className="text-[10px] text-[#6B7280]">
                      К зачислению: <strong>{Number(previewData.total_profit).toLocaleString("ru-RU")} ₽</strong> на счета <strong>{previewData.investors_count}</strong> соинвесторов
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    Готово к перечислению
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E5EB] text-[10px] uppercase font-bold text-[#6B7280]">
                        <th className="pb-2">Инвестор</th>
                        <th className="pb-2 text-right">Вложено</th>
                        <th className="pb-2 text-right">Положенный процент</th>
                        <th className="pb-2 text-right text-[#111111]">К начислению</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E5EB]/60">
                      {previewData.items.map((item) => (
                        <tr key={item.investor_id} className="hover:bg-[#F8FAFC]">
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
                          <td className="py-2.5 text-right font-mono font-bold text-amber-800">
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

                <div className="pt-2 text-[11px] text-[#6B7280] flex items-center gap-1.5">
                  <HiOutlineInformationCircle className="size-4 text-[#6B7280] shrink-0" />
                  <span>
                    Средства будут мгновенно переведены с расчётного эскроу проекта на баланс каждого инвестора
                  </span>
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

        {/* Modal Footer: кнопки никогда не слипаются! четкое разделение gap-3 */}
        <DialogFooter className="gap-3 pt-4 border-t border-[#E2E5EB] mt-4 flex flex-col-reverse sm:flex-row sm:justify-end items-stretch sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-xl border-[#E2E5EB] px-4 cursor-pointer hover:bg-[#F5F6F8]"
          >
            Закрыть
          </Button>

          {activeTab === "calculate" && (
            <Button
              type="button"
              onClick={handleConfirmDistribution}
              disabled={distributing || !previewData || !profitAmount || Number(profitAmount) <= 0}
              className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl h-10 px-5 gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <HiOutlineCheckCircle className="size-4" />
              <span>
                {distributing
                  ? "Зачисление средств..."
                  : `Подтвердить и перевести ${Number(profitAmount || 0).toLocaleString("ru-RU")} ₽`}
              </span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
