"use client"

import * as React from "react"
import {
  HiOutlineDocumentCheck,
  HiOutlineShieldCheck,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEyeSlash,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineFingerPrint,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { useDossier } from "@/app/admin/layout"

interface ContentItem {
  item_type: "lab_tech" | "investor_idea" | "task"
  id: number
  author_id?: number
  title: string
  summary: string
  category: string
  trl_level: number
  budget_total: number
  file_hash: string
  moderation_status: string
  moderation_comment?: string | null
  created_at: string
  author_name?: string
  organization_name?: string
  milestones?: any[]
  deadline?: string
}

export default function AdminContentPage() {
  const { authFetch } = useAuth()
  const { success, error } = useToast()
  const { openDossier } = useDossier()
  const [items, setItems] = React.useState<ContentItem[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"lab_tech" | "investor_idea" | "task">("lab_tech")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(null)

  // Модалка отклонения
  const [rejectModal, setRejectModal] = React.useState(false)
  const [rejectComment, setRejectComment] = React.useState("")

  // Модалка редактирования перед публикацией
  const [editModal, setEditModal] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState("")
  const [editSummary, setEditSummary] = React.useState("")
  const [editCategory, setEditCategory] = React.useState("")
  const [editTrl, setEditTrl] = React.useState(4)
  const [editBudget, setEditBudget] = React.useState("1000000")

  // Confirmations
  const [confirmApprove, setConfirmApprove] = React.useState(false)
  const [confirmHide, setConfirmHide] = React.useState(false)

  const loadContent = React.useCallback(async (isSilent = false) => {
    if (!isSilent && initialLoading) setInitialLoading(true)
    else setRefreshing(true)

    try {
      const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : ""
      const res = await authFetch(`/api/v1/admin/content?type=${activeTab}${statusParam}`)
      if (res.ok) {
        const data: ContentItem[] = await res.json()
        setItems(data)
        if (data.length > 0) {
          setSelectedItem((prev) => (prev ? data.find((i) => i.id === prev.id) || data[0] : data[0]))
        } else {
          setSelectedItem(null)
        }
      }
    } catch (e) {
      console.error("loadContent error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, activeTab, statusFilter, initialLoading])

  React.useEffect(() => {
    loadContent(items.length > 0)
  }, [activeTab, statusFilter])

  const handleModerate = async (status: string, comment?: string) => {
    if (!selectedItem) return
    try {
      const res = await authFetch(`/api/v1/admin/content/${selectedItem.item_type}/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          moderation_comment: comment || null,
        }),
      })
      if (res.ok) {
        success(`Статус карточки изменён на: ${status}`, "Модерация")
        setRejectModal(false)
        setRejectComment("")
        loadContent(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка модерации", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedItem) return
    try {
      const res = await authFetch(`/api/v1/admin/content/${selectedItem.item_type}/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          summary: editSummary.trim(),
          category: editCategory.trim(),
          trl_level: Number(editTrl),
          budget_total: Number(editBudget),
        }),
      })
      if (res.ok) {
        success("Карточка успешно отредактирована модератором!", "Сохранено")
        setEditModal(false)
        loadContent(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка сохранения", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  const openEditModal = (item: ContentItem) => {
    setEditTitle(item.title)
    setEditSummary(item.summary)
    setEditCategory(item.category)
    setEditTrl(item.trl_level)
    setEditBudget(String(item.budget_total))
    setEditModal(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Предпубликационный контроль
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-1">
            Модерация Контента
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Проверка научных разработок НИИ, технологических идей инвесторов и R&D-задач биржи
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadContent(true)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
        >
          <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
          <span>{refreshing ? "Обновление..." : "Обновить список"}</span>
        </Button>
      </div>

      {/* Вкладки типов контента и фильтр статуса */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
          {[
            { id: "lab_tech", label: "Разработки НИИ" },
            { id: "investor_idea", label: "Идеи инвесторов" },
            { id: "task", label: "R&D-задачи (Биржа)" },
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

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[
            { id: "all", label: "Все" },
            { id: "pending", label: "На модерации" },
            { id: "approved", label: "Одобренные" },
            { id: "rejected", label: "Отклонённые" },
          ].map((sf) => (
            <button
              key={sf.id}
              onClick={() => setStatusFilter(sf.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === sf.id
                  ? "bg-[#111111] text-white shadow-xs"
                  : "bg-white border border-[#E2E5EB] text-[#6B7280] hover:text-[#111111]"
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px]">
        {/* Список карточек */}
        <div className="lg:col-span-2 space-y-3">
          {initialLoading && items.length === 0 ? (
            <div className="p-16 text-center space-y-2 bg-white rounded-2xl border border-[#E2E5EB]">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка каталога контента...</div>
            </div>
          ) : items.length === 0 ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-8 text-center text-xs text-[#6B7280] bg-white shadow-xs">
              Карточек в данном разделе не найдено
            </Card>
          ) : (
            items.map((it) => {
              const isSelected = selectedItem?.id === it.id && selectedItem?.item_type === it.item_type
              return (
                <Card
                  key={`${it.item_type}-${it.id}`}
                  onClick={() => setSelectedItem(it)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#F81B00]/50 ring-2 ring-[#F81B00]/15 bg-white shadow-md -translate-y-0.5"
                      : "border-[#E2E5EB] bg-white hover:border-[#111111]/20 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="font-semibold text-[#4B5563]">
                          {it.category}
                        </span>
                        {it.trl_level && (
                          <span className="text-[#6B7280] font-medium">
                            TRL {it.trl_level}
                          </span>
                        )}
                        <span className="text-[#111111] font-mono font-bold">
                          {Number(it.budget_total).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#111111] leading-snug">
                        {it.title}
                      </h4>
                      <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                        {it.summary}
                      </p>

                      <div className="text-[11px] text-[#9CA3AF] flex flex-wrap gap-4 pt-1">
                        <span>Автор: <strong className="text-[#111111]">{it.organization_name || it.author_name}</strong></span>
                        <span>Добавлено: {new Date(it.created_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1.5">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-[#4B5563]">
                        <span
                          className={`size-2 rounded-full ${
                            it.moderation_status === "approved"
                              ? "bg-emerald-500"
                              : it.moderation_status === "rejected"
                              ? "bg-red-500"
                              : "bg-amber-400"
                          }`}
                        />
                        <span>
                          {it.moderation_status === "approved"
                            ? "Опубликован"
                            : it.moderation_status === "rejected"
                            ? "Отклонён"
                            : "На проверке"}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">
                        #{it.id}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Детальная панель модерации */}
        <div className="lg:col-span-1">
          {selectedItem ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-6 space-y-5 bg-white shadow-xs sticky top-6">
              <div className="flex items-center justify-between border-b border-[#E2E5EB] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Инспекция объекта
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(selectedItem)}
                  className="rounded-xl text-xs gap-1.5 h-8 border-[#E2E5EB]"
                >
                  <HiOutlinePencilSquare className="size-3.5" />
                  <span>Правка</span>
                </Button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Название:</span>
                  <strong className="text-[#111111] text-sm block mt-0.5">{selectedItem.title}</strong>
                </div>

                <div>
                  <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider">Аннотация / Описание:</span>
                  <div className="p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl text-xs text-[#4B5563] max-h-36 overflow-y-auto leading-relaxed mt-1">
                    {selectedItem.summary}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Бюджет:</span>
                    <strong className="text-[#111111] font-mono">{Number(selectedItem.budget_total).toLocaleString("ru-RU")} ₽</strong>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Готовность:</span>
                    <strong className="text-[#111111]">TRL {selectedItem.trl_level}</strong>
                  </div>
                </div>

                {/* SHA-256 Проверка подлинности */}
                {selectedItem.file_hash && (
                  <div className="p-3 bg-[#FAFAFA] border border-[#E2E5EB] rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#9CA3AF] flex items-center gap-1">
                      <HiOutlineFingerPrint className="size-3 text-[#F81B00]" />
                      <span>Цифровой отпечаток (SHA-256):</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#6B7280] break-all block">
                      {selectedItem.file_hash}
                    </span>
                  </div>
                )}

                {selectedItem.moderation_comment && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs">
                    <strong className="block text-[10px] uppercase tracking-wider text-red-700">Замечания модератора:</strong>
                    {selectedItem.moderation_comment}
                  </div>
                )}
              </div>

              {/* Действия модератора */}
              <div className="space-y-2.5 pt-4 border-t border-[#E2E5EB]">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all duration-150 hover:-translate-y-0.5"
                    onClick={() => setConfirmApprove(true)}
                  >
                    Одобрить
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 font-bold text-xs rounded-xl shadow-xs transition-all duration-150 hover:-translate-y-0.5"
                    onClick={() => setRejectModal(true)}
                  >
                    На доработку
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl text-xs gap-1.5 border-[#E2E5EB] bg-white hover:bg-[#F5F6F8]"
                  onClick={() => setConfirmHide(true)}
                >
                  <HiOutlineEyeSlash className="size-3.5" />
                  <span>Скрыть / Архивировать</span>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs text-[#9CA3AF] border border-dashed border-[#E2E5EB] rounded-2xl bg-white">
              Выберите карточку для проверки и модерации
            </div>
          )}
        </div>
      </div>

      {/* SHADCN DIALOG: ОТКЛОНЕНИЕ / ДОРАБОТКА */}
      <Dialog open={rejectModal} onOpenChange={setRejectModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Отправить на доработку автору</DialogTitle>
            <DialogDescription>
              Опишите, что автору необходимо исправить (описание, прикреплённые чертежи, бюджет этапов).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Например: Не указана патентная чистота или бюджет этапа 2 завышен без обоснования..."
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
              disabled={!rejectComment.trim()}
              onClick={() => handleModerate("rejected", rejectComment.trim())}
              className="rounded-xl font-bold"
            >
              Отправить замечания
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN DIALOG: БЫСТРОЕ РЕДАКТИРОВАНИЕ */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование карточки перед публикацией</DialogTitle>
            <DialogDescription>
              Корректировка опечаток, форматирования или уточнение категории.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Название карточки:</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-[#374151]">Аннотация:</label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="w-full border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#374151]">Категория:</label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#374151]">TRL:</label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={editTrl}
                  onChange={(e) => setEditTrl(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#374151]">Бюджет (₽):</label>
                <Input
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
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
              Сохранить правки
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждения */}
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Одобрить и опубликовать карточку?"
        description="Разработка или задача станет общедоступной в общем каталоге платформы."
        confirmText="Одобрить публикацию"
        variant="default"
        onConfirm={() => handleModerate("approved")}
      />

      <ConfirmDialog
        open={confirmHide}
        onOpenChange={setConfirmHide}
        title="Скрыть карточку с платформы?"
        description="Карточка будет переведена в статус архива и перестанет показываться в поиске."
        confirmText="Скрыть"
        variant="outline"
        onConfirm={() => handleModerate("archived")}
      />
    </div>
  )
}
