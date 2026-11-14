"use client"

import * as React from "react"
import {
  HiOutlineCog6Tooth,
  HiOutlineBuildingLibrary,
  HiOutlineDocumentText,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlinePaperClip,
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
import { CopyButton } from "@/components/ui/copy-button"
import { useToast } from "@/components/ui/toast"
import { User } from "@/lib/auth-context"
import { PatentItem, DocumentItem } from "./dashboard-types"
import { InnViewExample, INNExampleItem } from "./inn-view-example"

interface SettingsTabProps {
  user: User | null
  onUpdateProfile: (data: any) => Promise<{ success: boolean; user?: User; error?: string }>
  onRefresh: () => void
  authFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function SettingsTab({ user, onUpdateProfile, onRefresh, authFetch }: SettingsTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"
  const verificationStatus = user?.verification_status || "pending"

  // Form State
  const [fullName, setFullName] = React.useState(user?.full_name || "")
  const [orgName, setOrgName] = React.useState(user?.organization_name || "")
  const [repName, setRepName] = React.useState(user?.representative_name || "")
  const [inn, setInn] = React.useState(user?.inn || "")
  const [ogrn, setOgrn] = React.useState(user?.ogrn || "")
  const [bio, setBio] = React.useState(user?.bio || "")
  const [websiteUrl, setWebsiteUrl] = React.useState(user?.website_url || "")
  const [externalLinks, setExternalLinks] = React.useState<{ title: string; url: string }[]>(user?.external_links || [])
  const [portfolioFiles, setPortfolioFiles] = React.useState<any[]>(user?.portfolio_files || [])
  const [saving, setSaving] = React.useState(false)

  // Portfolio & Links modals
  const [isLinkModalOpen, setIsLinkModalOpen] = React.useState(false)
  const [newLinkTitle, setNewLinkTitle] = React.useState("")
  const [newLinkUrl, setNewLinkUrl] = React.useState("")

  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = React.useState(false)
  const [newPortfolioTitle, setNewPortfolioTitle] = React.useState("")
  const [portfolioFileBlob, setPortfolioFileBlob] = React.useState<File | null>(null)
  const [uploadingPortfolio, setUploadingPortfolio] = React.useState(false)

  // INN live check
  const [innStatusMsg, setInnStatusMsg] = React.useState<string>("")
  const [innValidType, setInnValidType] = React.useState<"valid" | "invalid" | null>(null)

  // Patents list
  const [patents, setPatents] = React.useState<PatentItem[]>(
    user?.patents_info && Array.isArray(user.patents_info) ? user.patents_info : []
  )

  // Statutory documents list
  const [documents, setDocuments] = React.useState<DocumentItem[]>(
    user?.documents && Array.isArray(user.documents) ? user.documents : []
  )

  // New Patent Modal
  const [isPatentModalOpen, setIsPatentModalOpen] = React.useState(false)
  const [newPatentNumber, setNewPatentNumber] = React.useState("")
  const [newPatentTitle, setNewPatentTitle] = React.useState("")
  const [newPatentDate, setNewPatentDate] = React.useState("")
  const [newPatentFile, setNewPatentFile] = React.useState("")
  const [patentFileBlob, setPatentFileBlob] = React.useState<File | null>(null)

  // New Doc Modal
  const [isDocModalOpen, setIsDocModalOpen] = React.useState(false)
  const [newDocName, setNewDocName] = React.useState("")
  const [newDocType, setNewDocType] = React.useState("PDF скан")
  const [docFileBlob, setDocFileBlob] = React.useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = React.useState(false)

  // Patent deletion confirmation
  const [patentToDelete, setPatentToDelete] = React.useState<{ idx: number; title: string } | null>(null)
  // Doc deletion confirmation
  const [docToDelete, setDocToDelete] = React.useState<{ idx: number; name: string } | null>(null)

  // Validations
  const innClean = inn.replace(/\D/g, "")
  const isInnValid = isLab
    ? innClean.length === 10
    : innClean.length === 0 || innClean.length === 10 || innClean.length === 12
  const ogrnClean = ogrn.replace(/\D/g, "")
  const isOgrnValid = isLab ? ogrnClean.length === 13 : ogrnClean.length === 0 || ogrnClean.length === 13 || ogrnClean.length === 15

  // Live INN validation
  React.useEffect(() => {
    if (innClean.length === 10 || innClean.length === 12) {
      fetch(`/api/v1/auth/inn-lookup/${innClean}`)
        .then((r) => r.json())
        .then((d) => {
          setInnValidType(d.is_valid ? "valid" : "invalid")
          setInnStatusMsg(d.message || "")
        })
        .catch(() => {
          setInnValidType(null)
          setInnStatusMsg("")
        })
    } else {
      setInnValidType(null)
      setInnStatusMsg("")
    }
  }, [innClean])

  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setOrgName(user.organization_name || "")
      setRepName(user.representative_name || "")
      setInn(user.inn || "")
      setOgrn(user.ogrn || "")
      setBio(user.bio || "")
      setWebsiteUrl(user.website_url || "")
      setExternalLinks(user.external_links || [])
      setPortfolioFiles(user.portfolio_files || [])
      if (user.patents_info && Array.isArray(user.patents_info) && user.patents_info.length > 0) {
        setPatents(user.patents_info)
      }
      if (user.documents && Array.isArray(user.documents) && user.documents.length > 0) {
        setDocuments(user.documents)
      }
    }
  }, [user])

  // Save Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await onUpdateProfile({
        fullName: fullName.trim(),
        organizationName: orgName.trim(),
        representativeName: repName.trim(),
        inn: inn.trim(),
        ogrn: ogrn.trim(),
        bio: bio.trim(),
        websiteUrl: websiteUrl.trim(),
        externalLinks: externalLinks,
        portfolioFiles: portfolioFiles,
        patentsInfo: patents,
        documents: documents,
        requestReverification: verificationStatus === "rejected",
      })

      if (res.success) {
        success(
          verificationStatus === "rejected"
            ? "Документы и реквизиты обновлены! Организация отправлена на повторную модерацию."
            : "Профиль и реквизиты успешно сохранены!",
          "Данные обновлены"
        )
        onRefresh()
      } else {
        error(res.error || "Ошибка сохранения профиля", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSaving(false)
    }
  }

  // Add Patent
  const handleAddPatent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatentNumber.trim() || !newPatentTitle.trim()) return

    setUploadingDoc(true)
    try {
      if (patentFileBlob && authFetch) {
        const formData = new FormData()
        formData.append("file", patentFileBlob)
        formData.append("doc_type", "patent")
        formData.append("patent_number", newPatentNumber.trim())
        formData.append("title", newPatentTitle.trim())
        formData.append("patent_date", newPatentDate.trim())

        const res = await authFetch("/api/v1/auth/documents/upload", {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user?.patents_info) {
            setPatents(data.user.patents_info)
          }
          success(`Патент ${newPatentNumber} и скан успешно загружены на сервер`, "Патент сохранён")
          setIsPatentModalOpen(false)
          setNewPatentNumber("")
          setNewPatentTitle("")
          setNewPatentDate("")
          setPatentFileBlob(null)
          onRefresh()
          return
        }
      }

      // Metadata only fallback
      const newPat: PatentItem = {
        number: newPatentNumber.trim(),
        title: newPatentTitle.trim(),
        date: newPatentDate.trim() || new Date().toLocaleDateString("ru-RU"),
        attachment_name: patentFileBlob ? patentFileBlob.name : (newPatentFile.trim() || "scan_patent.pdf"),
      }
      setPatents([...patents, newPat])
      setIsPatentModalOpen(false)
      setNewPatentNumber("")
      setNewPatentTitle("")
      setNewPatentDate("")
      setNewPatentFile("")
      setPatentFileBlob(null)
      success(`Патент ${newPat.number} добавлен в базу лаборатории`, "Патент добавлен")
    } catch {
      error("Ошибка загрузки патента", "Ошибка")
    } finally {
      setUploadingDoc(false)
    }
  }

  // Remove Patent
  const handleRemovePatent = (idx: number) => {
    setPatents(patents.filter((_, i) => i !== idx))
  }

  // Add Doc
  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocName.trim()) return

    setUploadingDoc(true)
    try {
      if (docFileBlob && authFetch) {
        const formData = new FormData()
        formData.append("file", docFileBlob)
        formData.append("doc_type", "statutory")
        formData.append("title", newDocName.trim())

        const res = await authFetch("/api/v1/auth/documents/upload", {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user?.documents) {
            setDocuments(data.user.documents)
          }
          success(`Документ «${newDocName}» успешно загружен на сервер и отправлен на модерацию`, "Документ загружен")
          setIsDocModalOpen(false)
          setNewDocName("")
          setDocFileBlob(null)
          onRefresh()
          return
        }
      }

      // Metadata only fallback
      const newDoc: DocumentItem = {
        name: newDocName.trim(),
        type: newDocType,
        status: "pending",
        date: new Date().toLocaleDateString("ru-RU"),
      }
      setDocuments([...documents, newDoc])
      setIsDocModalOpen(false)
      setNewDocName("")
      setDocFileBlob(null)
      success(`Документ «${newDoc.name}» добавлен в список документов`, "Документ добавлен")
    } catch {
      error("Ошибка загрузки документа", "Ошибка")
    } finally {
      setUploadingDoc(false)
    }
  }

  // Remove Doc
  const handleRemoveDoc = async (idx: number) => {
    const updatedDocs = documents.filter((_, i) => i !== idx)
    setDocuments(updatedDocs)
    if (authFetch) {
      try {
        await authFetch("/api/v1/auth/profile/org", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: updatedDocs }),
        })
        onRefresh()
      } catch {}
    }
    success("Документ удален из списка", "Удаление выполнено")
    setDocToDelete(null)
  }

  // Portfolio file upload handler
  const handleUploadPortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!portfolioFileBlob || !authFetch) {
      error("Выберите файл для загрузки", "Файл не выбран")
      return
    }

    setUploadingPortfolio(true)
    try {
      const formData = new FormData()
      formData.append("file", portfolioFileBlob)
      formData.append("title", newPortfolioTitle.trim() || portfolioFileBlob.name)

      const res = await authFetch("/api/v1/auth/profile/files", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setPortfolioFiles(data.portfolio_files || [])
        success("Файл успешно добавлен в портфолио организации", "Файл загружен")
        setIsPortfolioModalOpen(false)
        setNewPortfolioTitle("")
        setPortfolioFileBlob(null)
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({}))
        error(err.detail || "Не удалось загрузить файл", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при загрузке", "Ошибка")
    } finally {
      setUploadingPortfolio(false)
    }
  }

  // Portfolio file delete handler
  const handleDeletePortfolio = async (fileId: string) => {
    if (!authFetch) return
    try {
      const res = await authFetch(`/api/v1/auth/profile/files/${fileId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        const data = await res.json()
        setPortfolioFiles(data.portfolio_files || [])
        success("Файл удален из портфолио", "Удалено")
        onRefresh()
      }
    } catch {
      error("Не удалось удалить файл", "Ошибка")
    }
  }

  // External Links Handlers
  const handleAddExternalLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLinkUrl.trim()) return
    const newLink = {
      title: newLinkTitle.trim() || newLinkUrl.trim(),
      url: newLinkUrl.trim(),
    }
    setExternalLinks([...externalLinks, newLink])
    setIsLinkModalOpen(false)
    setNewLinkTitle("")
    setNewLinkUrl("")
    success("Ссылка добавлена. Сохраните изменения в профиле.", "Ссылка добавлена")
  }

  const handleDeleteExternalLink = (idx: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== idx))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E2E5EB]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
          Настройки и Реквизиты
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          {isLab
            ? "Управление официальными реквизитами НИИ/ВУЗа, уставными документами и патентной базой"
            : "Профиль аккредитованного инвестора и юридические реквизиты для договоров НИОКР"}
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Organization / User Profile Form */}
        <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F3F5]">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                {isLab ? "Реквизиты научной организации" : "Реквизиты инвестора"}
              </h3>
              <span className="text-[10px] text-[#6B7280]">
                Указываются в официальных договорах и актах
              </span>
            </div>
            <InnViewExample
              currentRole={isLab ? "lab" : "investor"}
              onSelect={(ex) => {
                setInn(ex.inn)
                setOgrn(ex.ogrn)
                if (isLab) {
                  setOrgName(ex.name)
                  setRepName(ex.representative)
                } else {
                  setFullName(ex.name)
                }
                success(`Реквизиты «${ex.name}» подставлены! Нажмите «Сохранить реквизиты».`, "Пример применён")
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLab ? (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Полное официальное наименование НИИ / ВУЗа / Лаборатории
                  </label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="ФГБУН Институт металлургии и материаловедения им. Байкова РАН"
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#111111]">
                      ИНН организации (10 цифр)
                    </label>
                    {innClean && <CopyButton text={innClean} label="ИНН" />}
                  </div>
                  <Input
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="7728168971"
                    maxLength={10}
                    className={`h-9 text-xs rounded-xl font-mono tabular-nums ${
                      inn && !isInnValid ? "border-red-400 focus-visible:ring-red-400" : ""
                    }`}
                    required
                  />
                  {inn && !isInnValid && (
                    <p className="text-[11px] text-red-600 mt-1">
                      ИНН юридического лица должен состоять ровно из 10 цифр (введено: {innClean.length})
                    </p>
                  )}
                  {innStatusMsg && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        innValidType === "valid" ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {innStatusMsg}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#111111]">
                      ОГРН организации (13 цифр)
                    </label>
                    {ogrnClean && <CopyButton text={ogrnClean} label="ОГРН" />}
                  </div>
                  <Input
                    value={ogrn}
                    onChange={(e) => setOgrn(e.target.value)}
                    placeholder="1027739023412"
                    maxLength={13}
                    className={`h-9 text-xs rounded-xl font-mono tabular-nums ${
                      ogrn && !isOgrnValid ? "border-red-400 focus-visible:ring-red-400" : ""
                    }`}
                    required
                  />
                  {ogrn && !isOgrnValid && (
                    <p className="text-[11px] text-red-600 mt-1">
                      ОГРН должен состоять ровно из 13 цифр (введено: {ogrnClean.length})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    ФИО руководителя / уполномоченного представителя
                  </label>
                  <Input
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="Иванов Сергей Петрович"
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Контактный рабочий email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="h-9 text-xs rounded-xl bg-[#F8FAFC] text-[#6B7280]"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    ФИО инвестора или Наименование юридического лица
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ООО «Инновационные Технологии» / Смирнов Андрей Викторович"
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#111111]">
                      ИНН организации (если применимо)
                    </label>
                    {innClean && <CopyButton text={innClean} label="ИНН" />}
                  </div>
                  <Input
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="7701234567"
                    maxLength={12}
                    className={`h-9 text-xs rounded-xl font-mono tabular-nums ${
                      inn && !isInnValid ? "border-red-400 focus-visible:ring-red-400" : ""
                    }`}
                  />
                  {inn && !isInnValid && (
                    <p className="text-[11px] text-red-600 mt-1">
                      ИНН должен состоять из 10 (юрлицо) или 12 (физлицо) цифр
                    </p>
                  )}
                  {innStatusMsg && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        innValidType === "valid" ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {innStatusMsg}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#111111] block mb-1">
                    Контактный email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="h-9 text-xs rounded-xl bg-[#F8FAFC] text-[#6B7280]"
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Lab Statutory Documents Block */}
        {isLab && (
          <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F5]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Уставные документы организации
                </h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Устав, свидетельство ОГРН, выписка ЕГРЮЛ и приказ о назначении руководителя
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDocModalOpen(true)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                + Загрузить скан
              </Button>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic py-2">
                Уставные документы пока не загружены. Нажмите «+ Загрузить скан».
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <HiOutlineDocumentText className="size-4 text-[#F81B00] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#111111] truncate">{doc.name}</p>
                        <p className="text-[10px] text-[#6B7280]">{doc.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-[#F81B00] hover:underline"
                        >
                          Скачать
                        </a>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.status === "verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : doc.status === "rejected"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {doc.status === "verified"
                          ? "Проверено"
                          : doc.status === "rejected"
                          ? "Требует замены"
                          : "На проверке"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocToDelete({ idx, name: doc.name })}
                        title="Удалить документ"
                        className="p-1.5 text-[#9CA3AF] hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      >
                        <HiOutlineTrash className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Lab Patent Base Block */}
        {isLab && (
          <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F5]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                  Патентная база лаборатории
                </h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Подтверждённые патенты прикрепляются к откликам на R&D-задачи и повышают рейтинг НИИ
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPatentModalOpen(true)}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                + Добавить патент
              </Button>
            </div>

            {patents.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic py-2">
                В патентной базе пока нет записей. Нажмите «+ Добавить патент».
              </p>
            ) : (
              <div className="space-y-2">
                {patents.map((pat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-[#111111]">
                          {pat.number}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">от {pat.date}</span>
                        {pat.attachment_name && (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-sm border border-emerald-200">
                            Скан подтверждён
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#4B5563] leading-snug truncate">{pat.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pat.file_url && (
                        <a
                          href={pat.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-[#F81B00] hover:underline"
                        >
                          Скан
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setPatentToDelete({ idx, title: pat.title })}
                        title="Удалить патент"
                        className="p-1.5 text-[#9CA3AF] hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      >
                        <HiOutlineTrash className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Extended Profile & Dossier Block */}
        <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-5">
          <div className="pb-3 border-b border-[#F1F3F5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
              Публичное досье и компетенции организации
            </h3>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Информация отображается в публичной карточке контрагента, карточках задач и откликах
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Описание деятельности и научные компетенции
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Опишите ключевые направления R&D, технологическую базу, опыт выполнения заказных исследований и имеющееся уникальное оборудование..."
                className="w-full p-3 text-xs rounded-xl border border-[#E2E5EB] focus:outline-none focus:ring-1 focus:ring-[#111111] resize-y"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Официальный веб-сайт
              </label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://institute.ras.ru"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* External Links */}
            <div className="pt-2 border-t border-[#F1F3F5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#111111]">
                    Внешние профили и аккредитации
                  </h4>
                  <p className="text-[10px] text-[#6B7280]">
                    Ссылки на Сколково, РНФ, eLibrary, Хабр, публикации
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="text-xs border-[#E2E5EB] rounded-xl"
                >
                  + Добавить ссылку
                </Button>
              </div>

              {externalLinks.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Ссылки пока не добавлены.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F8FAFC] border border-[#E2E5EB] rounded-lg text-xs"
                    >
                      <span className="font-medium text-[#111111]">{link.title}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExternalLink(idx)}
                        className="text-neutral-400 hover:text-red-500 ml-1 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Files */}
            <div className="pt-2 border-t border-[#F1F3F5] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#111111]">
                    Материалы портфолио и презентации
                  </h4>
                  <p className="text-[10px] text-[#6B7280]">
                    PDF-презентации, каталоги услуг, свидетельства и буклеты
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPortfolioModalOpen(true)}
                  className="text-xs border-[#E2E5EB] rounded-xl"
                >
                  + Загрузить презентацию / буклет
                </Button>
              </div>

              {portfolioFiles.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Файлы портфолио пока не загружены.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {portfolioFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-[#111111] truncate">{f.name}</p>
                        <p className="text-[10px] text-neutral-400">
                          {(f.size / 1024).toFixed(0)} КБ • {f.uploaded_at}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="text-xs text-[#F81B00] hover:underline"
                        >
                          Скачать
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolio(f.id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving || !isInnValid || !isOgrnValid}
            className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl shadow-xs px-6 py-2.5 cursor-pointer"
          >
            {saving ? (
              "Сохранение..."
            ) : verificationStatus === "rejected" ? (
              <span className="flex items-center gap-1.5">
                <HiOutlineArrowPath className="size-4" />
                Сохранить и отправить повторно на модерацию
              </span>
            ) : (
              "Сохранить реквизиты"
            )}
          </Button>
        </div>
      </form>

      {/* New Patent Modal */}
      <Dialog open={isPatentModalOpen} onOpenChange={setIsPatentModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Добавление патента в реестр лаборатории
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Укажите реквизиты патента на изобретение или полезную модель РФ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPatent} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Номер патента (e.g. RU 2741234 C1)
              </label>
              <Input
                value={newPatentNumber}
                onChange={(e) => setNewPatentNumber(e.target.value)}
                placeholder="RU 2741234 C1"
                className="h-9 text-xs rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название изобретения / патента
              </label>
              <Input
                value={newPatentTitle}
                onChange={(e) => setNewPatentTitle(e.target.value)}
                placeholder="Способ получения композитных материалов..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Дата выдачи
                </label>
                <Input
                  value={newPatentDate}
                  onChange={(e) => setNewPatentDate(e.target.value)}
                  placeholder="15.06.2023"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Скан патента (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setPatentFileBlob(f)
                      setNewPatentFile(f.name)
                    }
                  }}
                  className="w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#111111] file:text-white hover:file:bg-black cursor-pointer"
                />
              </div>
            </div>

            {patentFileBlob && (
              <p className="text-[11px] text-emerald-600 font-medium">
                Выбран файл: {patentFileBlob.name} ({(patentFileBlob.size / 1024).toFixed(1)} КБ)
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPatentModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={uploadingDoc}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {uploadingDoc ? "Загрузка на сервер..." : "Добавить патент"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Doc Modal */}
      <Dialog open={isDocModalOpen} onOpenChange={setIsDocModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Загрузка уставного документа
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Файл отправляется куратору модерации на соответствие требованиям.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDoc} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Наименование документа
              </label>
              <Input
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Например: Выписка из ЕГРЮЛ от 10.11.2026"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Тип документа</label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
              >
                <option value="PDF скан с печатью">PDF скан с печатью</option>
                <option value="Официальная выписка">Официальная выписка с ЭЦП</option>
                <option value="Приказ о назначении">Приказ о назначении руководителя</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Файл документа (PDF или скан)
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setDocFileBlob(f)
                    if (!newDocName) setNewDocName(f.name.replace(/\.[^/.]+$/, ""))
                  }
                }}
                className="w-full text-xs text-[#6B7280] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#111111] file:text-white hover:file:bg-black cursor-pointer"
              />
              {docFileBlob && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Выбран файл: {docFileBlob.name} ({(docFileBlob.size / 1024).toFixed(1)} КБ)
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDocModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={uploadingDoc}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {uploadingDoc ? "Загрузка на сервер..." : "Прикрепить документ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Patent Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={!!patentToDelete}
        onOpenChange={(open) => {
          if (!open) setPatentToDelete(null)
        }}
        title="Удаление патента"
        description={
          patentToDelete
            ? `Вы уверены, что хотите удалить патент «${patentToDelete.title}» из реестра лаборатории? Это действие нельзя отменить.`
            : ""
        }
        confirmText="Удалить патент"
        cancelText="Отмена"
        variant="destructive"
        onConfirm={() => {
          if (patentToDelete) {
            handleRemovePatent(patentToDelete.idx)
            setPatentToDelete(null)
            success("Патент удален из реестра", "Удаление выполнено")
          }
        }}
      />

      {/* Statutory Doc Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => {
          if (!open) setDocToDelete(null)
        }}
        title="Удаление уставного документа"
        description={
          docToDelete
            ? `Вы уверены, что хотите удалить документ «${docToDelete.name}»? Это действие нельзя отменить.`
            : ""
        }
        confirmText="Удалить документ"
        cancelText="Отмена"
        variant="destructive"
        onConfirm={() => {
          if (docToDelete) {
            handleRemoveDoc(docToDelete.idx)
          }
        }}
      />

      {/* External Link Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Добавить внешнюю ссылку
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Укажите название и URL-адрес внешнего профиля, публикации или каталога
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddExternalLink} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название ссылки (например, «Профиль Сколково» или «Каталог оборудования»)
              </label>
              <Input
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="Профиль в Сколково"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                URL-адрес
              </label>
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://sk.ru/..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                Добавить ссылку
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Portfolio File Upload Modal */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Загрузка материала в портфолио
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Загрузите PDF-презентацию, каталог оборудования или буклет услуг
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadPortfolio} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название документа
              </label>
              <Input
                value={newPortfolioTitle}
                onChange={(e) => setNewPortfolioTitle(e.target.value)}
                placeholder="Презентация научных компетенций 2026"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Файл (PDF, DOCX, ZIP)
              </label>
              <Input
                type="file"
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files[0]) {
                    setPortfolioFileBlob(files[0])
                    if (!newPortfolioTitle.trim()) {
                      setNewPortfolioTitle(files[0].name.replace(/\.[^/.]+$/, ""))
                    }
                  }
                }}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={uploadingPortfolio}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {uploadingPortfolio ? "Загрузка..." : "Загрузить файл"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
