"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineUsers,
  HiOutlineBuildingLibrary,
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlineShieldCheck,
  HiOutlineNoSymbol,
  HiOutlineArrowPath,
  HiOutlineIdentification,
  HiOutlineEnvelope,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CopyButton } from "@/components/ui/copy-button"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { useDossier } from "@/app/admin/layout"

interface UserItem {
  id: number
  email: string
  role: "investor" | "lab"
  status: string
  verification_status: "pending" | "verified" | "rejected"
  is_admin: boolean
  is_active: boolean
  full_name: string
  organization_name?: string | null
  inn?: string | null
  ogrn?: string | null
  representative_name?: string | null
  patents_info?: any[]
  documents?: any[]
  moderation_comment?: string | null
  created_at?: string | null
}

export default function AdminUsersPage() {
  const { authFetch } = useAuth()
  const { openDossier } = useDossier()
  const { success, error } = useToast()
  const [users, setUsers] = React.useState<UserItem[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"pending_labs" | "labs" | "investors" | "blocked" | "all">("pending_labs")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null)

  // Чеклист проверки НИИ перед верификацией
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false)
  const [checkEgryl, setCheckEgryl] = React.useState(false)
  const [checkRep, setCheckRep] = React.useState(false)
  const [checkRnp, setCheckRnp] = React.useState(false)

  // Модалка отклонения
  const [rejectModal, setRejectModal] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState("")

  // Модалка блокировки
  const [blockModal, setBlockModal] = React.useState(false)
  const [blockReason, setBlockReason] = React.useState("")

  // Модалка редактирования реквизитов
  const [editModal, setEditModal] = React.useState(false)
  const [editOrgName, setEditOrgName] = React.useState("")
  const [editRepName, setEditRepName] = React.useState("")
  const [editInn, setEditInn] = React.useState("")
  const [editOgrn, setEditOgrn] = React.useState("")
  const [editFullName, setEditFullName] = React.useState("")
  const [editIsAdmin, setEditIsAdmin] = React.useState(false)

  // Reset confirmation
  const [confirmReset, setConfirmReset] = React.useState(false)

  const loadUsers = React.useCallback(async (isSilent = false) => {
    if (!isSilent && initialLoading) setInitialLoading(true)
    else setRefreshing(true)

    try {
      const params = new URLSearchParams()
      params.set("tab", activeTab)
      if (searchQuery) params.set("search", searchQuery)
      const res = await authFetch(`/api/v1/admin/users?${params.toString()}`)
      if (res.ok) {
        const data: UserItem[] = await res.json()
        setUsers(data)
        if (data.length > 0) {
          setSelectedUser((prev) => (prev ? data.find((u) => u.id === prev.id) || data[0] : data[0]))
        } else {
          setSelectedUser(null)
        }
      }
    } catch (e) {
      console.error("loadUsers error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, activeTab, searchQuery, initialLoading])

  React.useEffect(() => {
    loadUsers(users.length > 0)
  }, [activeTab, searchQuery])

  const handleVerify = async (status: "verified" | "rejected" | "pending", comment?: string) => {
    if (!selectedUser) return
    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_status: status,
          comment: comment || null,
        }),
      })
      if (res.ok) {
        success(`Статус верификации обновлён: ${status}`, "Верификация")
        setVerifyModalOpen(false)
        setRejectModal(false)
        setRejectReason("")
        setCheckEgryl(false)
        setCheckRep(false)
        setCheckRnp(false)
        loadUsers(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const handleToggleBlock = async (isActive: boolean, reason?: string) => {
    if (!selectedUser) return
    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: isActive,
          reason: reason || null,
        }),
      })
      if (res.ok) {
        success(isActive ? "Аккаунт успешно разблокирован!" : "Аккаунт заблокирован!", "Статус аккаунта")
        setBlockModal(false)
        setBlockReason("")
        loadUsers(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка блокировки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    try {
      const res = await authFetch(`/api/v1/admin/users/${selectedUser.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_name: editOrgName.trim() || null,
          representative_name: editRepName.trim() || null,
          inn: editInn.trim() || null,
          ogrn: editOgrn.trim() || null,
          full_name: editFullName.trim() || selectedUser.full_name,
          is_admin: editIsAdmin,
        }),
      })
      if (res.ok) {
        success("Реквизиты и параметры пользователя успешно обновлены!", "Сохранено")
        setEditModal(false)
        loadUsers(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка обновления", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const openEditModal = (u: UserItem) => {
    setEditOrgName(u.organization_name || "")
    setEditRepName(u.representative_name || "")
    setEditInn(u.inn || "")
    setEditOgrn(u.ogrn || "")
    setEditFullName(u.full_name || "")
    setEditIsAdmin(u.is_admin || false)
    setEditModal(true)
  }

  const isChecklistComplete = checkEgryl && checkRep && checkRnp

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#F81B00]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F81B00]">
              Контроль субъектов экосистемы
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-1">
            Пользователи и НИИ
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Верификация институтов РАН, проверка заказчиков, блокировка нарушителей и администрирование ролей
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadUsers(false)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
        >
          <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
          <span>{refreshing ? "Обновление..." : "Обновить список"}</span>
        </Button>
      </div>

      {/* Поиск и фильтры-табы */}
      <div className="space-y-3.5">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
          <Input
            placeholder="Поиск по наименованию организации, ИНН, представителю, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl border-[#E2E5EB] text-xs bg-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#F81B00]/20"
          />
        </div>

        <div className="inline-flex flex-wrap p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
          {[
            { id: "pending_labs", label: "Заявки НИИ (На проверке)" },
            { id: "labs", label: "Все НИИ и Лаборатории" },
            { id: "investors", label: "Инвесторы и Компании" },
            { id: "blocked", label: "Заблокированные" },
            { id: "all", label: "Все пользователи" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px]">
        {/* Список пользователей (сохраняется во время перезапроса без дерганий) */}
        <div className="lg:col-span-2 space-y-3">
          {initialLoading && users.length === 0 ? (
            <div className="p-16 text-center space-y-2 bg-white rounded-2xl border border-[#E2E5EB]">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка базы пользователей...</div>
            </div>
          ) : users.length === 0 ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center text-xs text-[#6B7280] bg-white shadow-xs">
              Пользователей по заданным критериям не найдено
            </Card>
          ) : (
            users.map((u) => {
              const isSelected = selectedUser?.id === u.id
              return (
                <Card
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-[#F81B00]/50 ring-2 ring-[#F81B00]/15 bg-white shadow-md -translate-y-0.5"
                      : "border-[#E2E5EB] bg-white hover:border-[#111111]/20 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#4B5563]">
                          {u.role === "lab" ? "НИИ / Лаборатория" : "Инвестор"}
                        </span>
                        {u.is_admin && (
                          <span className="text-[10px] font-bold text-[#111111] bg-zinc-100 px-2 py-0.5 rounded-md border border-[#E2E5EB]">
                            Администратор
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-red-600" />
                            Заблокирован
                          </span>
                        )}
                        {u.inn && <span className="text-[11px] text-[#9CA3AF] font-mono">ИНН: {u.inn}</span>}
                      </div>

                      <h4 className="text-base font-bold text-[#111111] truncate">
                        {u.organization_name || u.full_name}
                      </h4>
                      <div className="text-xs text-[#6B7280] flex flex-wrap gap-4">
                        <span>Email: <strong className="text-[#111111]">{u.email}</strong></span>
                        {u.representative_name && (
                          <span>Представитель: <strong className="text-[#111111]">{u.representative_name}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-2">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-[#4B5563]">
                        <span
                          className={`size-2 rounded-full ${
                            u.verification_status === "verified"
                              ? "bg-emerald-500"
                              : u.verification_status === "rejected"
                              ? "bg-red-500"
                              : "bg-amber-400"
                          }`}
                        />
                        <span>
                          {u.verification_status === "verified"
                            ? "Верифицирован"
                            : u.verification_status === "rejected"
                            ? "Отклонён"
                            : "На проверке"}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                        <Link
                          href={`/admin/tickets?user_id=${u.id}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className="text-[#6B7280] hover:text-[#111111] transition-colors"
                        >
                          Написать
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDossier(u.id)
                          }}
                          className="text-[#F81B00] hover:underline cursor-pointer"
                        >
                          Досье →
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Боковая панель деталей и управления */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-6 space-y-5 bg-white shadow-xs sticky top-6">
              <div className="flex items-center justify-between border-b border-[#E2E5EB] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Карточка субъекта
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDossier(selectedUser.id)}
                    className="rounded-xl text-[11px] gap-1 h-8 border-[#E2E5EB]"
                  >
                    <HiOutlineArrowTopRightOnSquare className="size-3.5 text-[#F81B00]" />
                    <span>Досье 360°</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(selectedUser)}
                    className="rounded-xl text-xs gap-1 h-8 border-[#E2E5EB]"
                  >
                    <HiOutlinePencilSquare className="size-3.5" />
                    <span>Правка</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Организация / Имя:</span>
                  <strong className="text-[#111111] text-sm block mt-0.5">
                    {selectedUser.organization_name || selectedUser.full_name}
                  </strong>
                </div>

                <div>
                  <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Официальный представитель:</span>
                  <strong className="text-[#111111]">{selectedUser.representative_name || selectedUser.full_name}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ИНН:</span>
                      {selectedUser.inn && <CopyButton text={selectedUser.inn} label="ИНН" />}
                    </div>
                    <span className="font-mono font-bold text-[#111111] tabular-nums">{selectedUser.inn || "—"}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ОГРН:</span>
                      {selectedUser.ogrn && <CopyButton text={selectedUser.ogrn} label="ОГРН" />}
                    </div>
                    <span className="font-mono font-bold text-[#111111] tabular-nums">{selectedUser.ogrn || "—"}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Email:</span>
                    <CopyButton text={selectedUser.email} label="Email" />
                  </div>
                  <span className="text-[#111111] font-medium">{selectedUser.email}</span>
                </div>

                <div>
                  <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Роль и статус:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {selectedUser.role}
                    </Badge>
                    <Badge variant={selectedUser.is_active ? "default" : "destructive"} className="rounded-full text-[10px]">
                      {selectedUser.is_active ? "Активен" : "Заблокирован"}
                    </Badge>
                  </div>
                </div>

                {selectedUser.moderation_comment && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs">
                    <strong className="block text-[10px] uppercase tracking-wider text-red-700">Комментарий модератора:</strong>
                    {selectedUser.moderation_comment}
                  </div>
                )}

                {/* Прикрепленные документы */}
                {selectedUser.documents && Array.isArray(selectedUser.documents) && selectedUser.documents.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">
                      Прикреплённые уставные документы:
                    </span>
                    <div className="space-y-1">
                      {selectedUser.documents.map((d: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E2E5EB] rounded-lg text-[11px]"
                        >
                          <span className="truncate max-w-[170px] font-medium text-[#111111]">{d.name}</span>
                          {d.file_url ? (
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#F81B00] font-bold hover:underline shrink-0 ml-2"
                            >
                              Открыть
                            </a>
                          ) : (
                            <span className="text-[#9CA3AF] text-[10px] ml-2">скан учтён</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Патенты лаборатории */}
                {selectedUser.patents_info && Array.isArray(selectedUser.patents_info) && selectedUser.patents_info.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">
                      Патенты лаборатории ({selectedUser.patents_info.length}):
                    </span>
                    <div className="space-y-1">
                      {selectedUser.patents_info.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E2E5EB] rounded-lg text-[11px]"
                        >
                          <span className="font-mono font-bold text-[#111111]">{p.number}</span>
                          {p.file_url ? (
                            <a
                              href={p.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#F81B00] font-bold hover:underline shrink-0 ml-2"
                            >
                              Скан
                            </a>
                          ) : (
                            <span className="text-[#9CA3AF] text-[10px] ml-2">скан учтён</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Действия модератора */}
              <div className="space-y-2.5 pt-4 border-t border-[#E2E5EB]">
                {selectedUser.role === "lab" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all duration-150 hover:-translate-y-0.5"
                        onClick={() => setVerifyModalOpen(true)}
                      >
                        Подтвердить НИИ
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 font-bold text-xs rounded-xl shadow-xs transition-all duration-150 hover:-translate-y-0.5"
                        onClick={() => setRejectModal(true)}
                      >
                        Отклонить
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-xs gap-1.5 border-[#E2E5EB] bg-white hover:bg-[#F5F6F8]"
                      onClick={() => setConfirmReset(true)}
                    >
                      <HiOutlineArrowPath className="size-3.5" />
                      <span>Отправить на повторную проверку</span>
                    </Button>
                  </div>
                )}

                {/* Блокировка / разблокировка */}
                <Button
                  variant={selectedUser.is_active ? "destructive" : "default"}
                  size="sm"
                  className="w-full rounded-xl font-bold text-xs shadow-xs transition-all duration-150 hover:-translate-y-0.5"
                  onClick={() => {
                    if (selectedUser.is_active) {
                      setBlockModal(true)
                    } else {
                      handleToggleBlock(true)
                    }
                  }}
                >
                  {selectedUser.is_active ? "Заблокировать аккаунт" : "Разблокировать аккаунт"}
                </Button>

                {/* Написать пользователю */}
                <Link
                  href={`/admin/tickets?user_id=${selectedUser.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl text-xs font-semibold text-[#111111] transition-all shadow-xs"
                >
                  <HiOutlineEnvelope className="size-4 text-[#F81B00]" />
                  <span>Написать обращение пользователю</span>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs text-[#9CA3AF] border border-dashed border-[#E2E5EB] rounded-2xl bg-white">
              Выберите пользователя для просмотра реквизитов и управления
            </div>
          )}
        </div>
      </div>

      {/* SHADCN DIALOG: ОБЯЗАТЕЛЬНЫЙ ЧЕКЛИСТ МОДЕРАТОРА ДЛЯ ВЕРИФИКАЦИИ НИИ */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Обязательный чек-лист верификации НИИ</DialogTitle>
            <DialogDescription>
              Перед аккредитацией института в системе «Точка Роста» подтвердите выполнение проверок регламента:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <label className="flex items-start gap-3 p-3 bg-[#F5F6F8] rounded-xl cursor-pointer select-none">
              <Checkbox
                checked={checkEgryl}
                onCheckedChange={(c) => setCheckEgryl(Boolean(c))}
                className="mt-0.5"
              />
              <span className="text-[#374151] leading-snug">
                <strong>Проверка ИНН и выписки ЕГРЮЛ:</strong> организация ведёт научную деятельность, реквизиты совпадают с государственным реестром.
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-[#F5F6F8] rounded-xl cursor-pointer select-none">
              <Checkbox
                checked={checkRep}
                onCheckedChange={(c) => setCheckRep(Boolean(c))}
                className="mt-0.5"
              />
              <span className="text-[#374151] leading-snug">
                <strong>Полномочия представителя:</strong> лицо уполномочено действовать от имени института (доверенность/руководитель).
              </span>
            </label>

            <label className="flex items-start gap-3 p-3 bg-[#F5F6F8] rounded-xl cursor-pointer select-none">
              <Checkbox
                checked={checkRnp}
                onCheckedChange={(c) => setCheckRnp(Boolean(c))}
                className="mt-0.5"
              />
              <span className="text-[#374151] leading-snug">
                <strong>Проверка добросовестности:</strong> организация отсутствует в реестре недобросовестных поставщиков (РНП).
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setVerifyModalOpen(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button
              size="sm"
              disabled={!isChecklistComplete}
              onClick={() => handleVerify("verified")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
            >
              Подтвердить аккредитацию НИИ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN DIALOG: ОТКЛОНЕНИЕ ЗАЯВКИ НИИ */}
      <Dialog open={rejectModal} onOpenChange={setRejectModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Отклонить заявку на верификацию</DialogTitle>
            <DialogDescription>
              Укажите причину отказа. Она будет отображена в кабинете института для исправления реквизитов.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: Недействительный ИНН или несоответствие наименования института данным ЕГРЮЛ..."
              className="w-full h-24 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white focus:border-[#F81B00] outline-none resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModal(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectReason.trim()}
              onClick={() => handleVerify("rejected", rejectReason.trim())}
              className="rounded-xl font-bold"
            >
              Отклонить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN DIALOG: БЛОКИРОВКА АККАУНТА */}
      <Dialog open={blockModal} onOpenChange={setBlockModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Блокировка аккаунта пользователя</DialogTitle>
            <DialogDescription>
              Пользователь не сможет входить в систему и совершать финансовые операции.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Укажите официальную причину блокировки..."
              className="w-full h-24 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white focus:border-[#F81B00] outline-none resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockModal(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!blockReason.trim()}
              onClick={() => handleToggleBlock(false, blockReason.trim())}
              className="rounded-xl font-bold"
            >
              Подтвердить блокировку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN DIALOG: РУЧНАЯ ПРАВКА РЕКВИЗИТОВ */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование профиля и реквизитов</DialogTitle>
            <DialogDescription>
              Изменение параметров субъекта с автоматической фиксацией в журнале аудита.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Организация / ФИО:</label>
              <Input
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                placeholder="ФГБУН Институт биоорганической химии РАН"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#374151]">ИНН:</label>
                <Input
                  value={editInn}
                  onChange={(e) => setEditInn(e.target.value)}
                  placeholder="7701234567"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#374151]">ОГРН:</label>
                <Input
                  value={editOgrn}
                  onChange={(e) => setEditOgrn(e.target.value)}
                  placeholder="1027700132195"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Представитель организации:</label>
              <Input
                value={editRepName}
                onChange={(e) => setEditRepName(e.target.value)}
                placeholder="Смирнов Алексей Викторович"
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="pt-2 border-t border-[#E2E5EB]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsAdmin}
                  onChange={(e) => setEditIsAdmin(e.target.checked)}
                  className="size-4 rounded accent-[#F81B00]"
                />
                <span className="font-bold text-[#111111]">Назначить администратором платформы</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditModal(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="bg-[#111111] hover:bg-[#333333] text-white rounded-xl font-bold"
            >
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждения */}
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Сбросить статус в «На проверке»?"
        description="Статус верификации организации вернётся в исходный 'pending'."
        confirmText="Сбросить статус"
        variant="outline"
        onConfirm={() => handleVerify("pending")}
      />
    </div>
  )
}
