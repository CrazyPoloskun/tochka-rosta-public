"use client"

import * as React from "react"
import {
  HiOutlineCreditCard,
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineLockClosed,
  HiOutlineBanknotes,
  HiOutlineShieldCheck,
  HiOutlineBuildingLibrary,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlineCheckBadge,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { CopyButton } from "@/components/ui/copy-button"
import { TableSkeleton } from "@/components/ui/skeleton-loader"
import { User } from "@/lib/auth-context"
import { TransactionItem } from "./dashboard-types"

interface FinancesTabProps {
  user: User | null
  availableBalance: number
  frozenBalance: number
  totalFunded: number
  transactions: TransactionItem[]
  loading: boolean
  onRefresh: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function FinancesTab({
  user,
  availableBalance,
  frozenBalance,
  totalFunded,
  transactions,
  loading,
  onRefresh,
  authFetch,
}: FinancesTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"

  // Investor: Deposit Modal
  const [isDepositOpen, setIsDepositOpen] = React.useState(false)
  const [depositAmount, setDepositAmount] = React.useState("500000")
  const [depositMethod, setDepositMethod] = React.useState<"bank_transfer" | "card">("bank_transfer")
  const [submittingDeposit, setSubmittingDeposit] = React.useState(false)
  const [invoiceData, setInvoiceData] = React.useState<any | null>(null)

  // Lab: Withdrawal Modal
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false)
  const [withdrawAmount, setWithdrawAmount] = React.useState("")
  const [bankAccount, setBankAccount] = React.useState("40702810900000012345")
  const [bik, setBik] = React.useState("044525225")
  const [recipientName, setRecipientName] = React.useState(
    user?.organization_name || user?.full_name || ""
  )
  const [submittingWithdraw, setSubmittingWithdraw] = React.useState(false)

  // Filter transactions
  const [txFilter, setTxFilter] = React.useState<string>("all")

  // Receipt / Transfer Confirmation Document Modal
  const [receiptData, setReceiptData] = React.useState<any | null>(null)
  const [loadingReceipt, setLoadingReceipt] = React.useState(false)

  // Demo Approve Payout
  const [demoApprovingTxId, setDemoApprovingTxId] = React.useState<number | null>(null)

  const handleDemoApprovePayout = async (txId: number) => {
    setDemoApprovingTxId(txId)
    try {
      const res = await authFetch(`/api/v1/finances/transactions/${txId}/demo-approve`, {
        method: "POST",
      })
      if (res.ok) {
        success("Выплата подтверждена и исполнена (DEMO)", "Успешно")
        onRefresh()
      } else {
        const err = await res.json()
        error(err.detail || "Не удалось подтвердить выплату", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при подтверждении выплаты", "Ошибка")
    } finally {
      setDemoApprovingTxId(null)
    }
  }

  const handleOpenReceipt = async (txId: number) => {
    setLoadingReceipt(true)
    try {
      const res = await authFetch(`/api/v1/finances/transactions/${txId}/receipt`)
      if (res.ok) {
        const data = await res.json()
        setReceiptData(data)
      } else {
        const err = await res.json().catch(() => ({}))
        error(err.detail || "Не удалось загрузить квитанцию перевода", "Ошибка")
      }
    } catch {
      error("Ошибка соединения при получении квитанции", "Ошибка")
    } finally {
      setLoadingReceipt(false)
    }
  }

  // Deposit handler (Investor)
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(depositAmount)
    if (!amt || amt <= 0) {
      error("Укажите корректную сумму пополнения", "Ошибка")
      return
    }

    setSubmittingDeposit(true)
    try {
      const res = await authFetch("/api/v1/finances/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          payment_method: depositMethod,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success(
          `Баланс успешно пополнен на ${amt.toLocaleString("ru-RU")} ₽!`,
          "Средства зачислены"
        )
        setIsDepositOpen(false)
        onRefresh()
      } else {
        error(data.detail || "Ошибка пополнения баланса", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingDeposit(false)
    }
  }

  // Generate printable invoice
  const handleLoadInvoice = async () => {
    const amt = Number(depositAmount)
    if (!amt || amt <= 0) {
      error("Укажите сумму для формирования счёта", "Ошибка")
      return
    }
    try {
      const res = await authFetch(`/api/v1/finances/invoice-preview?amount=${amt}`)
      if (res.ok) {
        setInvoiceData(await res.json())
      }
    } catch {
      error("Не удалось сформировать счёт на оплату", "Ошибка")
    }
  }

  // Withdraw handler (Lab)
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(withdrawAmount)
    if (!amt || amt <= 0) {
      error("Укажите корректную сумму для вывода", "Ошибка")
      return
    }
    if (amt > availableBalance) {
      error("Сумма вывода превышает доступный баланс", "Недостаточно средств")
      return
    }

    setSubmittingWithdraw(true)
    try {
      const res = await authFetch("/api/v1/finances/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          bank_account: bankAccount.trim(),
          bik: bik.trim(),
          recipient_name: recipientName.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success(
          `Заявка на вывод ${amt.toLocaleString("ru-RU")} ₽ на расчётный счёт организации принята в обработку!`,
          "Заявка сформирована"
        )
        setIsWithdrawOpen(false)
        setWithdrawAmount("")
        onRefresh()
      } else {
        error(data.detail || "Ошибка создания заявки на вывод", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingWithdraw(false)
    }
  }

  // Filtered list
  const filteredTxs = transactions.filter((tx) => {
    if (txFilter === "all") return true
    if (txFilter === "deposits") return tx.type === "deposit"
    if (txFilter === "escrow") return tx.type === "escrow_lock" || tx.type === "escrow_release"
    if (txFilter === "payouts") return tx.type === "payout" || tx.type === "profit_payout"
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Баланс и Финансы
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {isLab
              ? "Управление расчётным счётом НИИ, эскроу-резервы по проектам и вывод средств"
              : "Пополнение баланса, резервирование средств на эскроу-счетах сделок и история операций"}
          </p>
        </div>

        <div>
          {isLab ? (
            <Button
              onClick={() => {
                setWithdrawAmount(String(availableBalance))
                setIsWithdrawOpen(true)
              }}
              disabled={availableBalance <= 0}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
            >
              <HiOutlineBanknotes className="size-4 mr-1.5" />
              Запросить вывод средств
            </Button>
          ) : (
            <Button
              onClick={() => setIsDepositOpen(true)}
              className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs cursor-pointer"
            >
              <HiOutlineArrowDownLeft className="size-4 mr-1.5" />
              + Пополнить баланс
            </Button>
          )}
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Available */}
        <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isLab ? "Доступно к выводу" : "Доступный баланс"}
            </span>
            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HiOutlineBanknotes className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#111111]">
            {availableBalance.toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-[11px] text-[#6B7280]">
            {isLab
              ? "Размороженные средства после подтверждения сдачи этапов"
              : "Свободные средства для резервирования на этапах НИОКР"}
          </p>
        </Card>

        {/* Card 2: Frozen / Escrow */}
        <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isLab ? "Ожидает завершения этапов" : "Зарезервировано на эскроу"}
            </span>
            <div className="size-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <HiOutlineLockClosed className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#111111]">
            {frozenBalance.toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-[11px] text-[#6B7280]">
            {isLab
              ? "Сумма на резервных счетах активных проектов в работе"
              : "Заблокировано на эскроу-счетах активных этапов до сдачи отчёта"}
          </p>
        </Card>

        {/* Card 3: Total Volume */}
        <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white space-y-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isLab ? "Всего получено по сделкам" : "Всего профинансировано"}
            </span>
            <div className="size-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <HiOutlineCreditCard className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#111111]">
            {totalFunded.toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-[11px] text-[#6B7280]">
            Совокупный объём выполненных обязательств на платформе
          </p>
        </Card>
      </div>

      {/* Transactions Section */}
      <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              Реестр финансовых операций
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Все движения средств фиксируются и защищены протоколом эскроу-резервирования
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "Все операции" },
              { id: "deposits", label: "Пополнения" },
              { id: "escrow", label: "Эскроу-резервы" },
              { id: "payouts", label: "Выплаты и выводы" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTxFilter(f.id)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  txFilter === f.id
                    ? "bg-[#111111] text-white"
                    : "bg-[#F5F6F8] text-[#4B5563] hover:bg-[#E2E5EB]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading && transactions.length === 0 ? (
          <TableSkeleton rows={5} />
        ) : filteredTxs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6B7280] italic">
            Операций в реестре пока нет
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E5EB] text-[10px] uppercase font-bold text-[#6B7280]">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Дата</th>
                  <th className="py-2.5 px-3">Тип операции</th>
                  <th className="py-2.5 px-3">Назначение платежа</th>
                  <th className="py-2.5 px-3 text-right">Сумма</th>
                  <th className="py-2.5 px-3 text-right">Документ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredTxs.map((tx) => {
                  const isPositive =
                    tx.type === "deposit" ||
                    tx.type === "profit_payout" ||
                    (isLab && (tx.type === "escrow_release" || tx.type === "payout"))
                  const isNegative =
                    tx.type === "escrow_lock" || (!isLab && tx.type === "escrow_release")

                  return (
                    <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-[#6B7280] whitespace-nowrap">
                        <CopyButton text={String(tx.id)} label={`#${tx.id}`} title="Копировать ID транзакции" />
                      </td>
                      <td className="py-3 px-3 text-[#6B7280] whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.type === "deposit"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : tx.type === "profit_payout"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : tx.type === "escrow_lock"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : tx.type === "escrow_release"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-50 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {tx.type === "deposit"
                              ? "Пополнение"
                              : tx.type === "profit_payout"
                              ? "Прибыль синдиката"
                              : tx.type === "escrow_lock"
                              ? "Блокировка на эскроу"
                              : tx.type === "escrow_release"
                              ? "Приёмка этапа"
                              : tx.type === "payout"
                              ? "Вывод средств"
                              : "Транзакция"}
                          </span>
                          {tx.status === "pending" && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
                              В обработке
                            </span>
                          )}
                          {tx.status === "rejected" && (
                            <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.2 rounded-sm border border-red-200">
                              Отклонено
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#111111] max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                          isPositive
                            ? "text-emerald-600"
                            : isNegative
                            ? "text-[#111111]"
                            : "text-[#111111]"
                        }`}
                      >
                        {isPositive ? "+" : isNegative ? "-" : ""}
                        {Number(tx.amount).toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        {tx.status === "pending" && (
                          <button
                            type="button"
                            disabled={demoApprovingTxId === tx.id}
                            onClick={() => handleDemoApprovePayout(tx.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[11px] font-bold text-amber-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Мгновенное исполнение выплаты в демо-режиме"
                          >
                            <HiOutlineCheckCircle className="size-3.5 text-amber-600" />
                            <span>{demoApprovingTxId === tx.id ? "..." : "demo: подтвердить вывод"}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(tx.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#F5F6F8] border border-[#E2E5EB] hover:border-[#111111] text-[11px] font-semibold text-[#111111] rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="Официальная справка / квитанция о подтверждении перевода"
                        >
                          <HiOutlineDocumentText className="size-3.5 text-[#F81B00]" />
                          <span>Квитанция</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Deposit Modal (Investor) */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Пополнение баланса аккаунта
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Средства зачисляются на лицевой счёт и используются для резервирования на этапах разработки.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeposit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Сумма пополнения (₽)
              </label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
              <div className="flex gap-2 mt-2">
                {[100000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(String(amt))}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#F5F6F8] hover:bg-[#E2E5EB] rounded-lg transition-colors cursor-pointer"
                  >
                    +{amt.toLocaleString("ru-RU")} ₽
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Способ оплаты
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepositMethod("bank_transfer")}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    depositMethod === "bank_transfer"
                      ? "border-[#111111] bg-white ring-1 ring-[#111111]"
                      : "border-[#E2E5EB] bg-[#F8FAFC]"
                  }`}
                >
                  <p className="text-xs font-bold text-[#111111]">Безналичный платёж</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">Счёт на оплату для юрлиц</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMethod("card")}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    depositMethod === "card"
                      ? "border-[#111111] bg-white ring-1 ring-[#111111]"
                      : "border-[#E2E5EB] bg-[#F8FAFC]"
                  }`}
                >
                  <p className="text-xs font-bold text-[#111111]">Корпоративная карта</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">Мгновенное списание</p>
                </button>
              </div>

              {depositMethod === "bank_transfer" && (
                <button
                  type="button"
                  onClick={handleLoadInvoice}
                  className="w-full mt-3 py-2 px-3 border border-[#111111] text-[#111111] hover:bg-[#F5F6F8] rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  📄 Сформировать официальный счёт на оплату (Юрлицо)
                </button>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDepositOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingDeposit}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {submittingDeposit ? "Обработка..." : "Пополнить баланс"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Modal (Lab) */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Запрос вывода средств на расчётный счёт
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Перевод выполняется по безналичному расчёту на официальные реквизиты научной организации.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdraw} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Сумма к выводу (₽)
              </label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={String(availableBalance)}
                className={`h-9 text-xs rounded-xl ${
                  Number(withdrawAmount) > availableBalance ? "border-red-500 focus:ring-red-500" : ""
                }`}
                required
              />
              {Number(withdrawAmount) > availableBalance ? (
                <p className="text-[10px] text-red-600 font-semibold mt-1">
                  Сумма вывода превышает доступный остаток ({availableBalance.toLocaleString("ru-RU")} ₽)
                </p>
              ) : (
                <p className="text-[10px] text-[#6B7280] mt-1">
                  Доступно для вывода: <strong>{availableBalance.toLocaleString("ru-RU")} ₽</strong>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Наименование организации / Получатель
              </label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Расчётный счёт (20 цифр)
                </label>
                <Input
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  БИК банка (9 цифр)
                </label>
                <Input
                  value={bik}
                  onChange={(e) => setBik(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-[11px] text-[#6B7280]">
              Платёжное поручение формируется автоматически в течение 1 рабочего дня.
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingWithdraw}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {submittingWithdraw ? "Формирование..." : "Отправить заявку"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal for Legal Entities */}
      <Dialog open={!!invoiceData} onOpenChange={(open) => !open && setInvoiceData(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center justify-between">
              <span>Счёт на оплату {invoiceData?.invoice_number}</span>
              <span className="text-xs font-normal text-[#6B7280]">от {invoiceData?.date}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Официальные платёжные реквизиты для безналичного перевода через расчётный счёт.
            </DialogDescription>
          </DialogHeader>

          {invoiceData && (
            <div className="space-y-4 py-2 text-xs">
              {/* Supplier Requisites Box */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl space-y-2">
                <p className="font-bold text-[#111111]">{invoiceData.supplier.organization}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4B5563]">
                  <div>ИНН: <span className="font-mono font-semibold text-[#111111]">{invoiceData.supplier.inn}</span></div>
                  <div>КПП: <span className="font-mono font-semibold text-[#111111]">{invoiceData.supplier.kpp}</span></div>
                  <div>БИК: <span className="font-mono font-semibold text-[#111111]">{invoiceData.supplier.bik}</span></div>
                  <div>Банк: <span className="font-semibold text-[#111111]">{invoiceData.supplier.bank_name}</span></div>
                  <div className="col-span-2">Р/с: <span className="font-mono font-semibold text-[#111111]">{invoiceData.supplier.account}</span></div>
                  <div className="col-span-2">Корр/с: <span className="font-mono font-semibold text-[#111111]">{invoiceData.supplier.corr_account}</span></div>
                </div>
              </div>

              {/* Payer & Purpose */}
              <div className="p-3 border border-[#E2E5EB] rounded-xl space-y-1.5 text-[11px]">
                <p><span className="text-[#6B7280]">Плательщик:</span> <span className="font-semibold text-[#111111]">{invoiceData.customer.name}</span></p>
                <p><span className="text-[#6B7280]">Назначение:</span> <span className="text-[#111111]">{invoiceData.purpose}</span></p>
                <p className="pt-1 text-sm font-extrabold text-[#111111]">
                  Сумма к оплате: {Number(invoiceData.amount).toLocaleString("ru-RU")} ₽ ({invoiceData.supplier.nds})
                </p>
              </div>

              {/* QR Payload */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1 text-[11px] text-amber-900">
                <p className="font-bold">Платёжная строка ГОСТ Р 56042-2014:</p>
                <p className="font-mono text-[10px] break-all bg-white p-2 rounded-lg border border-amber-200">{invoiceData.qr_payload}</p>
                <p className="text-[10px] text-amber-800">Скопируйте эту строку в мобильный банк или вставьте реквизиты в 1С/ДБО.</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvoiceData(null)}
              className="text-xs border-[#E2E5EB] rounded-xl"
            >
              Закрыть
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print()
              }}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
            >
              Печать счёта
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Confirmation Receipt Modal */}
      <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[92vh] overflow-y-auto space-y-4">
          <DialogHeader className="border-b border-[#E2E5EB] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <HiOutlineCheckBadge className="size-5" />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold text-[#111111]">
                    Подтверждение банковского перевода
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#6B7280]">
                    Квитанция об исполнении расчётов в платёжном контуре «Точка Роста»
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                {receiptData?.status || "ПОДТВЕРЖДЕНО"}
              </Badge>
            </div>
          </DialogHeader>

          {receiptData && (
            <div className="space-y-4 text-xs">
              {/* Receipt Header Badge */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] block">
                    Номер документа / УИН
                  </span>
                  <span className="text-sm font-bold font-mono text-[#111111]">
                    {receiptData.receipt_number}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] block">
                    Дата и время фиксации
                  </span>
                  <span className="text-xs font-semibold text-[#111111]">
                    {receiptData.date}
                  </span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-4 bg-white border border-[#E2E5EB] rounded-xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                    {receiptData.operation_label}
                  </span>
                  <span className="text-xs text-[#4B5563] mt-0.5 block">
                    {receiptData.purpose}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-[#111111] font-mono">
                    {receiptData.amount_formatted}
                  </span>
                </div>
              </div>

              {/* Counterparties Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                    Плательщик / Отправитель:
                  </span>
                  <p className="font-bold text-[#111111]">{receiptData.payer.name}</p>
                  <p className="text-[11px] text-[#6B7280]">ИНН: {receiptData.payer.inn}</p>
                </div>

                <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                    Получатель средств:
                  </span>
                  <p className="font-bold text-[#111111]">{receiptData.recipient.name}</p>
                  <p className="text-[11px] text-[#6B7280]">ИНН: {receiptData.recipient.inn}</p>
                </div>
              </div>

              {/* Digital Signature & Bank Stamp */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <HiOutlineShieldCheck className="size-4 text-emerald-600" />
                    <span>Электронная цифровая подпись (ЭЦП ГОСТ Р 34.10-2012):</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800">
                    ПРОВЕРЕНО
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-[10px] text-emerald-900 break-all space-y-0.5">
                  <p><strong>SHA-256 хеш операции:</strong> {receiptData.digital_signature?.sha256}</p>
                  <p><strong>Удостоверяющий центр:</strong> {receiptData.digital_signature?.signed_by}</p>
                  <p><strong>Сертификат:</strong> {receiptData.digital_signature?.certificate}</p>
                </div>
                <p className="text-[10px] text-emerald-800 italic">
                  Настоящий электронный документ имеет юридическую силу платёжного поручения в соответствии со ст. 6 Федерального закона № 63-ФЗ «Об электронной подписи».
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#E2E5EB]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceiptData(null)}
              className="text-xs border-[#E2E5EB] rounded-xl cursor-pointer"
            >
              Закрыть
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print()
              }}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <HiOutlinePrinter className="size-4" />
              <span>Печать квитанции</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
