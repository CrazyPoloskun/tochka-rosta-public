"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineUsers,
  HiOutlineDocumentCheck,
  HiOutlineScale,
  HiOutlineLifebuoy,
  HiOutlineBanknotes,
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineFunnel,
  HiOutlineArrowPath,
} from "react-icons/hi2"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { RevenueDynamicsChart, EscrowFlowChart } from "@/components/ui/admin-charts"
import { useDossier } from "@/app/admin/layout"

interface AdminStats {
  pending_labs: number
  pending_content: number
  total_frozen_escrow: number
  platform_revenue: number
  active_disputes: number
  open_tickets: number
}

interface AuditLog {
  id: number
  admin_name: string
  admin_email: string
  action: string
  target_type: string
  target_id?: string | number | null
  details?: Record<string, any> | string | null
  created_at: string
}

export default function AdminOverviewPage() {
  const { authFetch } = useAuth()
  const { openDossier } = useDossier()
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [actionFilter, setActionFilter] = React.useState<string>("all")

  const loadData = React.useCallback(async (isSilent = false) => {
    if (!isSilent && initialLoading) setInitialLoading(true)
    else setRefreshing(true)

    try {
      const [statsRes, logsRes] = await Promise.all([
        authFetch("/api/v1/admin/stats"),
        authFetch(`/api/v1/admin/audit-logs${actionFilter !== "all" ? `?action=${actionFilter}` : ""}`),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (logsRes.ok) setLogs(await logsRes.json())
    } catch (e) {
      console.error("loadData error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, actionFilter, initialLoading])

  React.useEffect(() => {
    loadData(logs.length > 0)
  }, [actionFilter])

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-200" style={{ minHeight: "100%" }}>
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Панель управления
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-1">
            Сводка и Аналитика
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Оперативные показатели экосистемы, резервный счёт эскроу и реестр действий модераторов
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(false)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
        >
          <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
          <span>{refreshing ? "Обновление..." : "Обновить сводку"}</span>
        </Button>
      </div>

      {/* 6 Карточек метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Карточка 1: Заявки НИИ */}
        <Link href="/admin/users?tab=pending_labs" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Заявки НИИ на проверке
              </span>
              <div className="size-9 rounded-xl bg-red-50 text-[#F81B00] flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineUsers className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111111] tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-16 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                stats?.pending_labs ?? 0
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Требуют верификации ИНН</span>
              <HiOutlineArrowRight className="size-3.5 text-[#F81B00] transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Карточка 2: Объекты на модерации */}
        <Link href="/admin/content" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Контент на модерации
              </span>
              <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineDocumentCheck className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111111] tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-16 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                stats?.pending_content ?? 0
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Идеи, разработки, тендеры</span>
              <HiOutlineArrowRight className="size-3.5 text-[#F81B00] transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Карточка 3: Резерв в эскроу */}
        <Link href="/admin/finances" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Заморожено в эскроу
              </span>
              <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineBanknotes className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-32 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                `${Number(stats?.total_frozen_escrow ?? 0).toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Защищённый резерв сделок</span>
              <HiOutlineArrowRight className="size-3.5 text-[#F81B00] transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Карточка 4: Выручка платформы */}
        <Link href="/admin/finances" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Доход платформы
              </span>
              <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineBanknotes className="size-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-32 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                `${Number(stats?.platform_revenue ?? 0).toLocaleString("ru-RU")} ₽`
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Сервисный сбор платформы</span>
              <HiOutlineArrowRight className="size-3.5 text-emerald-600 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Карточка 5: Споры и арбитраж */}
        <Link href="/admin/projects?tab=dispute" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Споры и Арбитраж
              </span>
              <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineScale className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111111] tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-16 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                stats?.active_disputes ?? 0
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Требуют решения куратора</span>
              <HiOutlineArrowRight className="size-3.5 text-[#F81B00] transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

        {/* Карточка 6: Поддержка */}
        <Link href="/admin/tickets" className="group">
          <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[#111111]/20 cursor-pointer space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Открытые обращения
              </span>
              <div className="size-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <HiOutlineLifebuoy className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111111] tracking-tight">
              {initialLoading ? (
                <div className="h-9 w-16 bg-zinc-200 rounded-lg animate-pulse" />
              ) : (
                stats?.open_tickets ?? 0
              )}
            </div>
            <div className="text-xs text-[#6B7280] flex items-center justify-between pt-1 border-t border-[#F5F6F8]">
              <span className="group-hover:text-[#111111] transition-colors">Служба заботы о пользователях</span>
              <HiOutlineArrowRight className="size-3.5 text-[#F81B00] transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>

      </div>

      {/* Интерактивные графики аналитики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueDynamicsChart totalRevenue={stats?.platform_revenue} />
        <EscrowFlowChart frozenTotal={stats?.total_frozen_escrow} />
      </div>

      {/* Журнал аудита действий кураторов (без дергания) */}
      <Card className="rounded-2xl border-[#E2E5EB] p-6 bg-white shadow-xs space-y-5 min-h-[380px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
          <div>
            <h2 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
              <HiOutlineShieldCheck className="size-5 text-[#F81B00]" />
              <span>Оперативный журнал действий кураторов</span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Непрерывная фиксация всех модераций, финансовых решений и изменения статусов
            </p>
          </div>

          {/* Фильтр по типам операций */}
          <div className="flex flex-wrap items-center gap-1.5">
            <HiOutlineFunnel className="size-3.5 text-[#9CA3AF] mr-1" />
            {[
              { id: "all", label: "Все" },
              { id: "verify_user", label: "Верификации" },
              { id: "block_user", label: "Блокировки" },
              { id: "moderate_content", label: "Модерация" },
              { id: "finance_adjust", label: "Финансы" },
              { id: "resolve_milestone", label: "Арбитраж" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  actionFilter === tab.id
                    ? "bg-[#111111] text-white shadow-xs"
                    : "bg-[#F5F6F8] text-[#6B7280] hover:text-[#111111] hover:bg-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Таблица логов */}
        <div className="overflow-x-auto min-h-[220px]">
          {initialLoading && logs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка журнала аудита...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6B7280]">
              Записи в журнале аудита отсутствуют
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E5EB] text-[11px] font-bold uppercase text-[#9CA3AF] tracking-wider">
                  <th className="py-3 px-3">Время</th>
                  <th className="py-3 px-3">Администратор</th>
                  <th className="py-3 px-3">Действие</th>
                  <th className="py-3 px-3">Целевой объект</th>
                  <th className="py-3 px-3">Детали</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F6F8]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F6F8]/60 transition-colors">
                    <td className="py-3 px-3 text-[#6B7280] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#111111]">
                      {log.admin_name}
                      <span className="block text-[10px] font-normal text-[#9CA3AF]">{log.admin_email}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-medium text-[#111111]">
                        {log.action === "verify_user"
                          ? "Верификация"
                          : log.action === "reject_user"
                          ? "Отказ верификации"
                          : log.action === "block_user"
                          ? "Блокировка"
                          : log.action === "unblock_user"
                          ? "Разблокировка"
                          : log.action === "moderate_content"
                          ? "Модерация контента"
                          : log.action === "finance_adjust"
                          ? "Корректировка баланса"
                          : log.action === "resolve_milestone"
                          ? "Решение арбитража"
                          : log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#4B5563]">
                      <span className="font-medium text-[#111111]">{log.target_type}</span>
                      {log.target_id && (
                        <button
                          onClick={() => {
                            if (log.target_type === "user" && log.target_id) {
                              openDossier(Number(log.target_id))
                            }
                          }}
                          className={`text-[10px] ml-1 ${
                            log.target_type === "user" ? "text-[#F81B00] font-bold hover:underline cursor-pointer" : "text-[#9CA3AF]"
                          }`}
                        >
                          #{log.target_id}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#6B7280] max-w-xs truncate font-mono text-[11px]">
                      {typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
