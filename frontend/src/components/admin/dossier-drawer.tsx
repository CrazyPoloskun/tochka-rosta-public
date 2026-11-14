"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineUser,
  HiOutlineBuildingLibrary,
  HiOutlineDocumentCheck,
  HiOutlineBanknotes,
  HiOutlineScale,
  HiOutlineLifebuoy,
  HiOutlineXMark,
  HiOutlineFolder,
  HiOutlineShieldCheck,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineEnvelope,
} from "react-icons/hi2"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface DossierData {
  user: {
    id: number
    email: string
    role: string
    status: string
    verification_status: string
    is_admin: boolean
    is_active: boolean
    full_name: string
    organization_name?: string | null
    inn?: string | null
    ogrn?: string | null
    representative_name?: string | null
    patents_info: any[]
    documents: any[]
    moderation_comment?: string | null
    created_at?: string | null
  }
  balance: {
    available: number
    frozen: number
  }
  ideas: any[]
  projects: any[]
  transactions: any[]
  tickets: any[]
}

interface DossierDrawerProps {
  userId: number | null
  open: boolean
  onClose: () => void
}

export function DossierDrawer({ userId, open, onClose }: DossierDrawerProps) {
  const { authFetch } = useAuth()
  const [data, setData] = React.useState<DossierData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"info" | "ideas" | "projects" | "finances" | "tickets">("info")

  React.useEffect(() => {
    if (!userId || !open) {
      setData(null)
      return
    }

    const loadDossier = async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/v1/admin/users/${userId}/full`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch (e) {
        console.error("Dossier load error:", e)
      } finally {
        setLoading(false)
      }
    }

    loadDossier()
  }, [userId, open, authFetch])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-[#E2E5EB] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#F81B00]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F81B00]">
                Сквозное Досье 360°
              </span>
            </div>
            {data && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/tickets?user_id=${data.user.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#111111] hover:bg-[#2A2A2A] text-white text-[11px] font-semibold rounded-lg transition-all"
                >
                  <HiOutlineEnvelope className="size-3.5 text-[#F81B00]" />
                  <span>Написать в поддержку</span>
                </Link>
                <span className="text-[11px] font-mono text-[#6B7280]">
                  #{data.user.id}
                </span>
              </div>
            )}
          </div>
          <DialogTitle className="text-xl font-black text-[#111111] mt-1">
            {loading ? "Загрузка досье..." : data?.user.organization_name || data?.user.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            Единая сводка: реквизиты, балансы, публикации, контракты, транзакции и тикеты
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs text-[#6B7280]">Формирование полного досье субъекта...</div>
          </div>
        ) : !data ? (
          <div className="py-20 text-center text-xs text-[#6B7280]">
            Не удалось загрузить данные досье
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            {/* Вкладки досье */}
            <div className="flex border-b border-[#E2E5EB] gap-2">
              {[
                { id: "info", label: "Профиль и Реквизиты" },
                { id: "ideas", label: `Разработки (${data.ideas.length})` },
                { id: "projects", label: `Сделки (${data.projects.length})` },
                { id: "finances", label: `Баланс и Финансы` },
                { id: "tickets", label: `Тикеты (${data.tickets.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === t.id
                      ? "border-[#F81B00] text-[#111111]"
                      : "border-transparent text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Вкладка 1: Профиль */}
            {activeTab === "info" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#F5F6F8] rounded-xl border border-[#E2E5EB]">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Роль в системе:</span>
                    <strong className="text-[#111111]">{data.user.role === "lab" ? "НИИ / Лаборатория" : "Инвестор / Заказчик"}</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Статус верификации:</span>
                    <strong className="text-[#111111]">{data.user.verification_status}</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Email:</span>
                    <strong className="text-[#111111]">{data.user.email}</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Представитель:</span>
                    <strong className="text-[#111111]">{data.user.representative_name || data.user.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ИНН:</span>
                    <strong className="text-[#111111] font-mono">{data.user.inn || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ОГРН:</span>
                    <strong className="text-[#111111] font-mono">{data.user.ogrn || "—"}</strong>
                  </div>
                </div>

                {data.user.moderation_comment && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                    <strong className="block text-[10px] uppercase text-red-700">Замечание куратора:</strong>
                    {data.user.moderation_comment}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка 2: Разработки */}
            {activeTab === "ideas" && (
              <div className="space-y-2 text-xs">
                {data.ideas.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF]">Разработок не опубликовано</div>
                ) : (
                  data.ideas.map((item) => (
                    <div key={item.id} className="p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#111111]">{item.title}</div>
                        <div className="text-[11px] text-[#6B7280]">Категория: {item.category} • TRL {item.trl_level}</div>
                      </div>
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        {item.moderation_status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Вкладка 3: Сделки */}
            {activeTab === "projects" && (
              <div className="space-y-2 text-xs">
                {data.projects.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF]">Контрактов не заключено</div>
                ) : (
                  data.projects.map((proj) => (
                    <div key={proj.id} className="p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#111111]">{proj.title}</div>
                        <div className="text-[11px] text-[#6B7280]">Бюджет: {Number(proj.total_budget).toLocaleString("ru-RU")} ₽</div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {proj.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Вкладка 4: Финансы */}
            {activeTab === "finances" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-800">Доступный баланс:</span>
                    <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                      {Number(data.balance.available).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-blue-800">Заморожено в эскроу:</span>
                    <div className="text-xl font-black text-blue-600 font-mono mt-1">
                      {Number(data.balance.frozen).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#9CA3AF]">История транзакций ({data.transactions.length}):</span>
                  {data.transactions.map((tx) => (
                    <div key={tx.id} className="p-2.5 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-[#111111]">{tx.description}</span>
                        <span className="text-[10px] text-[#9CA3AF] block font-mono">{new Date(tx.created_at).toLocaleString("ru-RU")}</span>
                      </div>
                      <span className="font-mono font-bold text-[#111111]">
                        {Number(tx.amount).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка 5: Тикеты */}
            {activeTab === "tickets" && (
              <div className="space-y-2 text-xs">
                {data.tickets.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF]">Обращений в поддержку нет</div>
                ) : (
                  data.tickets.map((tk) => (
                    <div key={tk.id} className="p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#111111]">{tk.subject}</div>
                        <div className="text-[11px] text-[#6B7280]">Категория: {tk.category}</div>
                      </div>
                      <Badge variant={tk.status === "resolved" ? "default" : "secondary"} className="rounded-full text-[10px]">
                        {tk.status === "resolved" ? "Решён" : "Открыт"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
