"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { HiOutlineBanknotes, HiOutlineShieldCheck, HiOutlineArrowTrendingUp, HiOutlineLockClosed } from "react-icons/hi2"

// Аналитическая карточка выручки платформы
export function RevenueDynamicsChart({
  totalRevenue = 0,
}: {
  totalRevenue?: number
}) {
  const rev = Number(totalRevenue || 0)

  return (
    <Card className="rounded-2xl border border-[#E2E5EB] p-6 bg-white shadow-xs space-y-4">
      <div className="flex items-start justify-between border-b border-[#E2E5EB] pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Финансовые показатели
          </span>
          <h3 className="text-lg font-bold text-[#111111] mt-0.5">
            Доход платформы
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Фактически удержанные сервисные сборы с закрытых этапов сделок
          </p>
        </div>
        <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <HiOutlineArrowTrendingUp className="size-5" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-3xl font-extrabold text-[#111111] tracking-tight">
            {rev.toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            Суммарный накопленный объём комиссии сервиса
          </div>
        </div>

        <div className="p-4 bg-[#F5F6F8] rounded-xl space-y-2 border border-[#E2E5EB]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Порядок удержания:</span>
            <span className="font-semibold text-[#111111]">Автоматически при закрытии этапа</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Режим зачисления:</span>
            <span className="font-semibold text-emerald-600">Счёт платформы (ПАО Сбербанк)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Статус финансовых расчётов:</span>
            <span className="font-semibold text-[#111111]">Штатный режим</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Аналитическая карточка резервного эскроу-счёта
export function EscrowFlowChart({
  frozenTotal = 0,
}: {
  frozenTotal?: number
}) {
  const frozen = Number(frozenTotal || 0)

  return (
    <Card className="rounded-2xl border border-[#E2E5EB] p-6 bg-white shadow-xs space-y-4">
      <div className="flex items-start justify-between border-b border-[#E2E5EB] pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Гарантийный резерв
          </span>
          <h3 className="text-lg font-bold text-[#111111] mt-0.5">
            Резервный счёт эскроу
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Обеспечение безопасных расчётов между заказчиками и научными институтами
          </p>
        </div>
        <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <HiOutlineLockClosed className="size-5" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-3xl font-extrabold text-[#111111] tracking-tight">
            {frozen.toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-xs text-[#6B7280] mt-1">
            Заблокировано под текущие договоры НИОКР
          </div>
        </div>

        <div className="p-4 bg-[#F5F6F8] rounded-xl space-y-2 border border-[#E2E5EB]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Защита средств:</span>
            <span className="font-semibold text-[#111111]">100% номинальное покрытие</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Условия разблокировки:</span>
            <span className="font-semibold text-[#111111]">Подписание акта приёмки этапа</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Арбитражная защита:</span>
            <span className="font-semibold text-blue-600">Двусторонний безотзывный аккредитив</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
