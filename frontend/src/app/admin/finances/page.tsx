"use client"

import * as React from "react"
import {
  HiOutlineBanknotes,
  HiOutlinePlusCircle,
  HiOutlineArrowDownTray,
  HiOutlineArrowTrendingUp,
  HiOutlineScale,
  HiOutlineArrowPath,
  HiOutlineUser,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { useDossier } from "@/app/admin/layout"

interface UserAccount {
  user_id: number
  email: string
  full_name: string
  organization_name?: string | null
  role: string
  available_balance: number
  frozen_balance: number
}

interface TransactionItem {
  id: number
  from_user_id?: number | null
  to_user_id?: number | null
  project_id?: number | null
  amount: number
  type: string
  status?: string
  description: string
  bank_details?: any
  created_at: string
}

export default function AdminFinancesPage() {
  const { authFetch } = useAuth()
  const { success, error } = useToast()
  const { openDossier } = useDossier()
  const [accounts, setAccounts] = React.useState<UserAccount[]>([])
  const [transactions, setTransactions] = React.useState<TransactionItem[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"accounts" | "transactions">("accounts")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  // Модалка ручной корректировки баланса
  const [adjustModal, setAdjustModal] = React.useState(false)
  const [adjustUserId, setAdjustUserId] = React.useState<number | "">("")
  const [adjustAmount, setAdjustAmount] = React.useState("")
  const [adjustAction, setAdjustAction] = React.useState<"deposit" | "deduct">("deposit")
  const [adjustReason, setAdjustReason] = React.useState("")
  const [submittingAdjust, setSubmittingAdjust] = React.useState(false)

  const loadData = React.useCallback(async (isSilent = false) => {
    if (!isSilent && initialLoading) setInitialLoading(true)
    else setRefreshing(true)

    try {
      const typeParam = typeFilter !== "all" ? `?type=${typeFilter}` : ""
      const res = await authFetch(`/api/v1/admin/finances/transactions${typeParam}`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
        setTransactions(data.transactions || [])
      }
    } catch (e) {
      console.error("loadData error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, typeFilter, initialLoading])

  React.useEffect(() => {
    loadData(accounts.length > 0)
  }, [typeFilter])

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustUserId || !adjustAmount || !adjustReason.trim()) return
    setSubmittingAdjust(true)
    try {
      const res = await authFetch("/api/v1/admin/finances/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(adjustUserId),
          amount: Number(adjustAmount),
          action: adjustAction,
          reason: adjustReason.trim(),
        }),
      })
      if (res.ok) {
        success("Баланс пользователя успешно скорректирован!", "Финансовая операция")
        setAdjustModal(false)
        setAdjustAmount("")
        setAdjustReason("")
        loadData(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка корректировки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingAdjust(false)
    }
  }

  const handleApprovePayout = async (txId: number) => {
    try {
      const res = await authFetch(`/api/v1/admin/finances/transactions/${txId}/approve`, {
        method: "POST",
      })
      if (res.ok) {
        success("Выплата подтверждена и передана на исполнение в банк", "Выплата одобрена")
        loadData(true)
      } else {
        error("Ошибка одобрения выплаты", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const handleRejectPayout = async (txId: number) => {
    const reason = window.prompt("Укажите причину отклонения заявки на вывод (средства вернутся на баланс пользователя):")
    if (reason === null) return
    try {
      const res = await authFetch(
        `/api/v1/admin/finances/transactions/${txId}/reject?reason=${encodeURIComponent(reason || "Отклонено модератором")}`,
        { method: "POST" }
      )
      if (res.ok) {
        success("Заявка на вывод отклонена, средства возвращены на баланс", "Заявка отклонена")
        loadData(true)
      } else {
        error("Ошибка отклонения выплаты", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const exportCSV = () => {
    if (activeTab === "accounts") {
      const headers = "ID,Email,Имя/Организация,Роль,Доступно,Заморожено\n"
      const rows = accounts
        .map(
          (a) =>
            `${a.user_id},"${a.email}","${a.organization_name || a.full_name}",${a.role},${a.available_balance},${a.frozen_balance}`
        )
        .join("\n")
      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `accounts_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    } else {
      const headers = "ID,От кого,Кому,Проект,Сумма,Тип,Назначение,Дата\n"
      const rows = transactions
        .map(
          (t) =>
            `${t.id},${t.from_user_id || ""},${t.to_user_id || ""},${t.project_id || ""},${t.amount},${t.type},"${t.description}",${t.created_at}`
        )
        .join("\n")
      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    }
  }

  const openAdjustForUser = (userId: number) => {
    setAdjustUserId(userId)
    setAdjustAction("deposit")
    setAdjustModal(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Резервный счёт и лицевые счета
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-1">
            Финансы и Эскроу
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Контроль балансов, аудит транзакций и ручные корректировки счетов с фиксацией в аудите
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
          >
            <HiOutlineArrowDownTray className="size-3.5" />
            <span>Экспорт в CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setAdjustUserId("")
              setAdjustModal(true)
            }}
            className="gap-2 text-xs font-bold rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white shadow-xs transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <HiOutlinePlusCircle className="size-3.5" />
            <span>Корректировка баланса</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
          >
            <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
            <span>{refreshing ? "..." : "Обновить"}</span>
          </Button>
        </div>
      </div>

      {/* Вкладки: Лицевые счета / Реестр транзакций */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === "accounts"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            Лицевые счета пользователей ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === "transactions"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            Реестр транзакций ({transactions.length})
          </button>
        </div>

        {activeTab === "transactions" && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {[
              { id: "all", label: "Все" },
              { id: "deposit", label: "Пополнения" },
              { id: "escrow_lock", label: "Заморозка эскроу" },
              { id: "escrow_release", label: "Выплата НИИ" },
              { id: "escrow_refund", label: "Возврат инвестору" },
              { id: "admin_adjustment", label: "Корректировки" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  typeFilter === f.id
                    ? "bg-[#111111] text-white shadow-xs"
                    : "bg-white border border-[#E2E5EB] text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Контент вкладки 1: Лицевые счета */}
      {activeTab === "accounts" && (
        <Card className="rounded-2xl border-[#E2E5EB] p-6 bg-white shadow-xs min-h-[400px]">
          {initialLoading && accounts.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка счетов...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B7280]">
              Счета пользователей отсутствуют
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E5EB] text-[11px] font-bold uppercase text-[#9CA3AF] tracking-wider">
                    <th className="py-3 px-3">Пользователь / Организация</th>
                    <th className="py-3 px-3">Роль</th>
                    <th className="py-3 px-3 text-right">Доступный баланс</th>
                    <th className="py-3 px-3 text-right">Заморожено в эскроу</th>
                    <th className="py-3 px-3 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F6F8]">
                  {accounts.map((acc) => (
                    <tr key={acc.user_id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() => openDossier(acc.user_id)}
                          className="font-bold text-[#111111] hover:text-[#F81B00] transition-colors text-left block cursor-pointer"
                        >
                          {acc.organization_name || acc.full_name}
                        </button>
                        <div className="text-[11px] text-[#6B7280] font-mono">{acc.email} (ID #{acc.user_id})</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-semibold text-[#4B5563]">
                          {acc.role === "lab" ? "НИИ / Лаборатория" : "Инвестор"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-sm">
                        {Number(acc.available_balance).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[#F81B00] text-sm">
                        {Number(acc.frozen_balance).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustForUser(acc.user_id)}
                          className="h-8 text-xs font-bold rounded-xl border-[#E2E5EB] bg-white hover:bg-[#F5F6F8]"
                        >
                          Изменить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Контент вкладки 2: Реестр транзакций */}
      {activeTab === "transactions" && (
        <Card className="rounded-2xl border-[#E2E5EB] p-6 bg-white shadow-xs">
          {initialLoading && transactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка транзакций...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B7280]">
              Транзакций в данном статусе не найдено
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E5EB] text-[11px] font-bold uppercase text-[#9CA3AF] tracking-wider">
                    <th className="py-3 px-3">ID / Дата</th>
                    <th className="py-3 px-3">Тип операции</th>
                    <th className="py-3 px-3">Назначение</th>
                    <th className="py-3 px-3">От кого → Кому</th>
                    <th className="py-3 px-3 text-right">Сумма</th>
                    <th className="py-3 px-3 text-right">Статус / Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F8]">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[#6B7280] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#111111] tabular-nums">#{t.id}</span>
                          <CopyButton text={String(t.id)} title="Копировать ID транзакции" />
                        </div>
                        <span className="block text-[10px] text-[#9CA3AF]">
                          {new Date(t.created_at).toLocaleString("ru-RU")}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs font-medium text-[#111111]">
                          {t.type === "deposit"
                            ? "Пополнение"
                            : t.type === "escrow_lock"
                            ? "Резерв эскроу"
                            : t.type === "escrow_release"
                            ? "Выплата"
                            : t.type === "platform_fee"
                            ? "Комиссия сервиса"
                            : t.type === "manual_adjust"
                            ? "Корректировка"
                            : t.type === "payout"
                            ? "Заявка на вывод"
                            : t.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#111111] max-w-xs truncate font-medium">
                        {t.description}
                      </td>
                      <td className="py-3.5 px-3 text-[#6B7280] font-mono text-[11px]">
                        {t.from_user_id ? `User #${t.from_user_id}` : "Система"} →{" "}
                        {t.to_user_id ? `User #${t.to_user_id}` : "Эскроу"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-sm text-[#111111]">
                        {Number(t.amount).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {t.type === "payout" && t.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprovePayout(t.id)}
                              className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                              Одобрить
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayout(t.id)}
                              className="px-2 py-1 text-[11px] font-bold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors cursor-pointer"
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {t.status === "rejected" ? "Отклонено" : "Исполнено"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* SHADCN DIALOG: КОРРЕКТИРОВКА БАЛАНСА */}
      <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Корректировка лицевого счёта</DialogTitle>
            <DialogDescription>
              Ручное пополнение или списание для тестирования либо урегулирования претензий. Фиксируется в аудите.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustSubmit} className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#374151]">Лицевой счёт пользователя:</label>
              <select
                required
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value ? Number(e.target.value) : "")}
                className="w-full h-9 border border-[#E2E5EB] rounded-xl px-3 text-xs bg-[#F5F6F8] focus:bg-white outline-none cursor-pointer"
              >
                <option value="">Выберите пользователя...</option>
                {accounts.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.organization_name || a.full_name} ({a.email}) — Доступно: {Number(a.available_balance).toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Тип операции:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustAction("deposit")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    adjustAction === "deposit"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-[#F5F6F8] border-[#E2E5EB] text-[#6B7280]"
                  }`}
                >
                  + Начислить
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustAction("deduct")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    adjustAction === "deduct"
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-[#F5F6F8] border-[#E2E5EB] text-[#6B7280]"
                  }`}
                >
                  − Списать
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Сумма корректировки (₽):</label>
              <Input
                type="number"
                step="0.01"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="100000.00"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Основание / Причина:</label>
              <textarea
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Например: Пополнение резервного баланса для тестирования сделок R&D..."
                className="w-full h-20 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white focus:border-[#F81B00] outline-none resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModal(false)} className="rounded-xl">
                Отмена
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAdjust || !adjustUserId || !adjustAmount || !adjustReason.trim()}
                className="bg-[#111111] hover:bg-[#333333] text-white rounded-xl font-bold"
              >
                {submittingAdjust ? "Проведение операции..." : "Подтвердить операцию"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
