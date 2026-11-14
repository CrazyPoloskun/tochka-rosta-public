"use client"

import * as React from "react"
import {
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineCurrencyDollar,
  HiOutlineArrowRight,
  HiOutlineCheck,
  HiOutlineArrowPath,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineSparkles,
  HiOutlineDocumentText,
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { Project, SyndicateCapTable } from "./dashboard-types"

interface SyndicateModalProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
  userAvailableBalance: number
  currentUserId?: number
}

export function SyndicateModal({
  project,
  open,
  onOpenChange,
  onSuccess,
  authFetch,
  userAvailableBalance,
  currentUserId,
}: SyndicateModalProps) {
  const { error, success } = useToast()

  const [capTable, setCapTable] = React.useState<SyndicateCapTable | null>(null)
  const [loadingCapTable, setLoadingCapTable] = React.useState(false)
  const [depositAmount, setDepositAmount] = React.useState("")
  const [ipShareType, setIpShareType] = React.useState<string>("royalty")
  const [submittingJoin, setSubmittingJoin] = React.useState(false)
  const [submittingLeave, setSubmittingLeave] = React.useState(false)

  // Fetch Cap Table
  const fetchCapTable = React.useCallback(async () => {
    if (!project?.id) return
    setLoadingCapTable(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/syndicate/cap-table`)
      if (res.ok) {
        const data = await res.json()
        setCapTable(data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingCapTable(false)
    }
  }, [project?.id, authFetch])

  React.useEffect(() => {
    if (open && project?.id) {
      fetchCapTable()
      if (project.syndication_min_deposit) {
        setDepositAmount(String(project.syndication_min_deposit))
      }
    }
  }, [open, project?.id, fetchCapTable])

  if (!project) return null

  const minDeposit = project.syndication_min_deposit || 10000
  const parsedAmount = Number(depositAmount) || 0
  const totalRaised = capTable?.total_raised || project.syndication_total_raised || 0
  const softCap = capTable?.soft_cap || project.syndication_soft_cap || project.total_budget || 0
  const baseBudget = Math.max(softCap, totalRaised + parsedAmount)
  const estimatedSharePercent = baseBudget > 0 ? ((parsedAmount / baseBudget) * 100).toFixed(2) : "0.00"

  const userMembership = capTable?.members.find((m) => m.investor_id === currentUserId)
  const isLead = capTable?.is_lead || project.investor_id === currentUserId

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedAmount < minDeposit) {
      error(`Минимальный взнос соинвестора: ${minDeposit.toLocaleString("ru-RU")} ₽`, "Взнос ниже минимума")
      return
    }

    if (parsedAmount > userAvailableBalance) {
      error(
        `Недостаточно доступных средств на счёте. Доступно: ${userAvailableBalance.toLocaleString("ru-RU")} ₽`,
        "Пополните баланс"
      )
      return
    }

    setSubmittingJoin(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/syndicate/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          ip_share_type: ipShareType,
        }),
      })

      if (res.ok) {
        success(
          `Взнос ${parsedAmount.toLocaleString("ru-RU")} ₽ успешно зачислен на эскроу-счёт. Ваша доля зафиксирована!`,
          "Соинвестирование подтверждено"
        )
        fetchCapTable()
        onSuccess()
      } else {
        const errData = await res.json().catch(() => ({}))
        error(errData.detail || "Не удалось внести средства", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при выполнении транзакции", "Ошибка")
    } finally {
      setSubmittingJoin(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm("Вы уверены, что хотите выйти из синдиката? Замороженные средства вернутся на ваш доступный баланс.")) {
      return
    }

    setSubmittingLeave(true)
    try {
      const res = await authFetch(`/api/v1/projects/${project.id}/syndicate/leave`, {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        success(
          `Вы успешно вышли из синдиката. Средства (${Number(data.refunded_amount).toLocaleString("ru-RU")} ₽) возвращены на баланс.`,
          "Депозит возвращен"
        )
        fetchCapTable()
        onSuccess()
      } else {
        const errData = await res.json().catch(() => ({}))
        error(errData.detail || "Не удалось выйти из синдиката", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingLeave(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 border-[#E2E5EB] shadow-xl">
        <DialogHeader className="border-b border-[#E2E5EB] pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#F81B00]/10 text-[#F81B00]">
              <HiOutlineUserGroup className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-[#111111]">
                Коллективное соинвестирование
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                Сделка #{project.id}: «{project.title}»
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Progress Bar & Summary */}
          <div className="p-4 bg-[#F5F6F8] rounded-xl border border-[#E2E5EB] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#111111] flex items-center gap-1.5">
                <HiOutlineCurrencyDollar className="size-4 text-[#F81B00]" />
                <span>Собрано на эскроу: {totalRaised.toLocaleString("ru-RU")} ₽</span>
              </span>
              <span className="font-semibold text-[#6B7280]">
                Целевой объём финансирования: {softCap.toLocaleString("ru-RU")} ₽
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E2E5EB] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#111111] h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, softCap > 0 ? (totalRaised / softCap) * 100 : 0)}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>
                Прогресс: <strong>{capTable?.progress_percent || 0}%</strong>
              </span>
              <span>
                Мин. взнос: <strong>{minDeposit.toLocaleString("ru-RU")} ₽</strong>
              </span>
              <span>
                Статус:{" "}
                <strong className={project.syndication_status === "funded" ? "text-emerald-600" : "text-amber-600"}>
                  {project.syndication_status === "funded" ? "Цель достигнута" : "Сбор открыт"}
                </strong>
              </span>
            </div>
          </div>

          {/* Current User Status Banner */}
          {userMembership && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                  <HiOutlineShieldCheck className="size-4" />
                </span>
                <div>
                  <span className="font-bold">Вы участвуете в соинвестировании:</span>
                  <p className="text-[11px] text-emerald-800">
                    Внесено: <strong>{Number(userMembership.invested_amount).toLocaleString("ru-RU")} ₽</strong> • Доля в
                    проекте: <strong>{userMembership.share_percent}%</strong>
                  </p>
                </div>
              </div>

              {!isLead && project.syndication_status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLeave}
                  disabled={submittingLeave}
                  className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-lg h-7 gap-1"
                >
                  <HiOutlineArrowLeftOnRectangle className="size-3.5" />
                  <span>{submittingLeave ? "Отзыв..." : "Отозвать соинвестиции"}</span>
                </Button>
              )}
            </div>
          )}

          {/* Сводка о том, какой процент сейчас положен каждому участнику пропорционально вложенному */}
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E2E5EB]">
              <div>
                <div className="flex items-center gap-1.5">
                  <HiOutlineSparkles className="size-4 text-[#F81B00]" />
                  <span className="font-bold text-xs text-[#111111] uppercase tracking-wider">
                    Сводка причитающихся долей соинвесторов
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Процент владения результатами и распределения прибыли пропорционально внесённому капиталу
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-[#6B7280]">В пуле:</span>
                <span className="font-mono font-bold text-[#111111] bg-white px-2 py-0.5 rounded-lg border border-[#E2E5EB]">
                  {totalRaised.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>

            {/* Визуальная сегментированная шкала долей */}
            {capTable?.members && capTable.members.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-[#6B7280]">
                  <span>Распределение 100% долей пула:</span>
                  <span className="font-semibold text-[#111111]">{capTable.members.length} участн.</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                  {capTable.members.map((m, idx) => {
                    const colors = [
                      "bg-emerald-500",
                      "bg-sky-500",
                      "bg-indigo-500",
                      "bg-amber-500",
                      "bg-violet-500",
                      "bg-rose-500",
                    ]
                    const c = colors[idx % colors.length]
                    const pct = Number(m.share_percent)
                    return (
                      <div
                        key={m.id}
                        className={`${c} h-full border-r border-white/60 transition-all duration-300`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                        title={`${m.organization_name || m.investor_name}: ${pct.toFixed(2)}%`}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Быстрые карточки процентов участников */}
            {capTable?.members && capTable.members.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {capTable.members.map((m, idx) => {
                  const colors = [
                    { light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
                    { light: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
                    { light: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
                    { light: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
                    { light: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
                    { light: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
                  ]
                  const c = colors[idx % colors.length]
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 bg-white border border-[#E2E5EB] rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-[#111111] truncate block">
                          {m.organization_name || m.investor_name}
                        </span>
                        <span className="text-[10px] text-[#6B7280] block">
                          Взнос: {Number(m.invested_amount).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black font-mono ${c.light} ${c.text} border ${c.border}`}
                        >
                          {Number(m.share_percent).toFixed(2)}%
                        </span>
                        <span className="text-[9px] text-[#6B7280] block mt-0.5 font-medium">
                          {m.is_lead ? "Лид-инвестор" : "Соинвестор"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Детальный реестр долей участников */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#111111] text-[11px]">
                Детальный реестр долей участников:
              </span>
              <button
                type="button"
                onClick={fetchCapTable}
                className="text-[11px] text-[#6B7280] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
              >
                <HiOutlineArrowPath className={`size-3 ${loadingCapTable ? "animate-spin" : ""}`} />
                <span>Обновить</span>
              </button>
            </div>

            <div className="border border-[#E2E5EB] rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAFAFB] border-b border-[#E2E5EB] text-[10px] uppercase font-bold text-[#6B7280]">
                  <tr>
                    <th className="px-3.5 py-2">Инвестор</th>
                    <th className="px-3.5 py-2">Взнос</th>
                    <th className="px-3.5 py-2">Доля в результатах</th>
                    <th className="px-3.5 py-2">Тип прав</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E5EB]">
                  {capTable?.members && capTable.members.length > 0 ? (
                    capTable.members.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#111111]">
                              {m.organization_name || m.investor_name || `Инвестор #${m.investor_id}`}
                            </span>
                            {m.is_lead && (
                              <Badge className="bg-[#111111] text-white text-[9px] px-1.5 py-0 h-4 rounded">
                                Лид
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-medium text-[#111111]">
                          {Number(m.invested_amount).toLocaleString("ru-RU")} ₽
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-[#F81B00]">
                          {m.share_percent}%
                        </td>
                        <td className="px-3.5 py-2.5 text-[#6B7280] text-[11px]">
                          {m.ip_share_type === "royalty"
                            ? "Роялти от продаж"
                            : m.ip_share_type === "patent_co_owner"
                            ? "Совладелец патента"
                            : "Лицензиат"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-xs text-[#9CA3AF] italic">
                        Соинвесторы пока не внесли средства в сделку.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form: Join or Owner Notice */}
          {isLead || project.investor_id === currentUserId ? (
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-[#111111]">
                Вы являетесь инициатором и ведущим инвестором данной сделки
              </p>
              <p className="text-[11px] text-[#6B7280]">
                Вам доступен открытый просмотр всех участников и их взносов. Самостоятельное соинвестирование в собственный проект отключено.
              </p>
            </div>
          ) : project.syndication_status === "open" ? (
            <form onSubmit={handleJoin} className="p-4 bg-white border border-[#E2E5EB] rounded-xl space-y-3">
              <span className="font-bold text-xs text-[#111111] block">
                {userMembership ? "Довнести софинансирование:" : "Внести софинансирование в сделку:"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                    Сумма софинансирования в рублях:
                  </label>
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={minDeposit}
                    step={10000}
                    placeholder={String(minDeposit)}
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                  <span className="text-[10px] text-[#6B7280] mt-1 block">
                    Доступно на счёте: <strong>{userAvailableBalance.toLocaleString("ru-RU")} ₽</strong>
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#374151] block mb-1">
                    Тип закрепления прав на разработку:
                  </label>
                  <select
                    value={ipShareType}
                    onChange={(e) => setIpShareType(e.target.value)}
                    className="w-full h-9 border border-[#E2E5EB] rounded-xl px-2.5 text-xs bg-white text-[#111111] focus:border-[#F81B00] outline-hidden"
                  >
                    <option value="royalty">Роялти (процент от будущих доходов)</option>
                    <option value="patent_co_owner">Совладелец патента в Роспатенте</option>
                    <option value="exclusive_license">Неисключительная лицензия на внедрение</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Share Calculator */}
              {parsedAmount > 0 && (
                <div className="p-2.5 bg-[#F5F6F8] rounded-lg text-xs flex items-center justify-between text-[#374151]">
                  <span>
                    Расчётная доля при взносе {parsedAmount.toLocaleString("ru-RU")} ₽:
                  </span>
                  <span className="font-bold text-base text-[#111111]">
                    ~{estimatedSharePercent}%
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={submittingJoin || parsedAmount < minDeposit}
                className="w-full gap-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer h-9"
              >
                <HiOutlineCheck className="size-4 text-emerald-400" />
                <span>
                  {submittingJoin
                    ? "Заморозка на эскроу..."
                    : `Подтвердить и внести ${parsedAmount > 0 ? parsedAmount.toLocaleString("ru-RU") + " ₽" : ""} на эскроу`}
                </span>
              </Button>
            </form>
          ) : (
            <div className="p-3 bg-[#F5F6F8] rounded-xl text-center text-xs text-[#6B7280]">
              Сбор средств по данному проекту успешно завершён. Этапы сделки профинансированы.
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 pt-3 border-t border-[#E2E5EB]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-xl border-[#E2E5EB] px-4 cursor-pointer hover:bg-[#F5F6F8]"
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
