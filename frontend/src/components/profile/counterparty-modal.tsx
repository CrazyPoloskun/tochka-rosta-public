"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineXMark,
  HiOutlineBuildingOffice2,
  HiOutlineUserCircle,
  HiOutlineCheckBadge,
  HiOutlineGlobeAlt,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineDocumentArrowDown,
  HiOutlineChatBubbleLeftRight,
  HiOutlineShieldCheck,
  HiOutlineAcademicCap,
  HiOutlineClock,
} from "react-icons/hi2"

import { useAuth } from "@/lib/auth-context"
import { PublicUserProfile } from "@/components/dashboard/dashboard-types"

interface CounterpartyModalProps {
  userId: number | null
  isOpen: boolean
  onClose: () => void
  onOpenChat?: (targetUserId: number, targetName: string) => void
}

export function CounterpartyModal({
  userId,
  isOpen,
  onClose,
  onOpenChat,
}: CounterpartyModalProps) {
  const { authFetch } = useAuth()
  const [profile, setProfile] = React.useState<PublicUserProfile | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null)
      setError(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    authFetch(`/api/v1/users/${userId}/public-profile`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Не удалось загрузить карточку контрагента")
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) setProfile(data)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Ошибка загрузки")
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, userId, authFetch])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white border border-[#E2E5EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E5EB] bg-[#F9FAFB]">
          <div className="flex items-center space-x-2">
            <HiOutlineBuildingOffice2 className="w-5 h-5 text-[#F81B00]" />
            <span className="text-xs font-mono uppercase tracking-wider text-[#737373]">
              Досье контрагента • Платформа «Точка Роста»
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-[#111111] hover:bg-[#E2E5EB]/50 transition-colors"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 font-mono">Загрузка карточки организации...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && profile && (
            <>
              {/* Профиль и статус */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium uppercase ${
                        profile.role === "lab"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {profile.role === "lab" ? "НИИ / Лаборатория" : "Заказчик / Инвестор"}
                    </span>
                    {profile.verification_status === "verified" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                        <HiOutlineCheckBadge className="w-3.5 h-3.5 text-emerald-600" />
                        Аккредитованная организация
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[#111111]">
                    {profile.organization_name || profile.full_name}
                  </h2>
                  {profile.representative_name && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <HiOutlineUserCircle className="w-4 h-4" />
                      Представитель: <span className="text-[#111111] font-medium">{profile.representative_name}</span>
                    </p>
                  )}
                  {profile.inn && (
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
                      <span>ИНН: <strong className="text-[#111111]">{profile.inn}</strong></span>
                      {profile.ogrn && (
                        <span>ОГРН: <strong className="text-[#111111]">{profile.ogrn}</strong></span>
                      )}
                    </div>
                  )}
                </div>

                {onOpenChat && (
                  <button
                    onClick={() => {
                      onClose()
                      onOpenChat(profile.id, profile.organization_name || profile.full_name)
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#F81B00] text-white text-xs font-medium uppercase tracking-wider transition-colors shrink-0"
                  >
                    <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                    Написать в чат
                  </button>
                )}
              </div>

              {/* Статистика активности */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F9FAFB] border border-[#E2E5EB]">
                  <div className="text-xs font-mono text-neutral-500 uppercase">Завершено НИОКР</div>
                  <div className="text-lg font-bold text-[#111111] mt-0.5">{profile.completed_projects_count}</div>
                </div>
                <div className="p-3 bg-[#F9FAFB] border border-[#E2E5EB]">
                  <div className="text-xs font-mono text-neutral-500 uppercase">В работе</div>
                  <div className="text-lg font-bold text-[#111111] mt-0.5">{profile.active_projects_count}</div>
                </div>
                <div className="p-3 bg-[#F9FAFB] border border-[#E2E5EB]">
                  <div className="text-xs font-mono text-neutral-500 uppercase">Разработок / Идей</div>
                  <div className="text-lg font-bold text-[#111111] mt-0.5">{profile.ideas_count}</div>
                </div>
                <div className="p-3 bg-[#F9FAFB] border border-[#E2E5EB]">
                  <div className="text-xs font-mono text-neutral-500 uppercase">Задач / ТЗ</div>
                  <div className="text-lg font-bold text-[#111111] mt-0.5">{profile.tasks_count}</div>
                </div>
              </div>

              {/* Описание деятельности и компетенции */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                  О деятельности и научно-технических компетенциях
                </h3>
                <div className="p-4 bg-[#F9FAFB] border border-[#E2E5EB] text-sm text-[#111111] leading-relaxed whitespace-pre-wrap">
                  {profile.bio || "Организация пока не заполнила расширенное описание деятельности."}
                </div>
              </div>

              {/* Официальный сайт и внешние ссылки */}
              {(profile.website_url || (profile.external_links && profile.external_links.length > 0)) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Веб-ресурсы и аккредитации
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.website_url && (
                      <a
                        href={profile.website_url.startsWith("http") ? profile.website_url : `https://${profile.website_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E5EB] hover:border-[#111111] text-xs font-medium text-[#111111] transition-colors"
                      >
                        <HiOutlineGlobeAlt className="w-3.5 h-3.5 text-[#F81B00]" />
                        <span>Официальный сайт</span>
                        <HiOutlineArrowTopRightOnSquare className="w-3 h-3 text-neutral-400" />
                      </a>
                    )}
                    {profile.external_links?.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E5EB] hover:border-[#111111] text-xs font-medium text-[#111111] transition-colors"
                      >
                        <span>{link.title || link.url}</span>
                        <HiOutlineArrowTopRightOnSquare className="w-3 h-3 text-neutral-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Портфолио и презентации */}
              {profile.portfolio_files && profile.portfolio_files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Материалы портфолио и презентации ({profile.portfolio_files.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profile.portfolio_files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="flex items-center justify-between p-3 bg-white border border-[#E2E5EB] hover:border-[#111111] group transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <HiOutlineDocumentArrowDown className="w-5 h-5 text-[#F81B00] shrink-0" />
                          <div className="truncate text-left">
                            <div className="text-xs font-medium text-[#111111] truncate group-hover:text-[#F81B00] transition-colors">
                              {file.name}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              {(file.size / 1024).toFixed(0)} КБ • {file.uploaded_at}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-neutral-400 group-hover:text-[#111111] shrink-0 ml-2">
                          Скачать
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Патенты и РИД */}
              {profile.patents_info && profile.patents_info.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Зарегистрированные патенты и свидетельства РИД ({profile.patents_info.length})
                  </h3>
                  <div className="space-y-2">
                    {profile.patents_info.map((patent, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#F9FAFB] border border-[#E2E5EB] flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#111111] text-white">
                              {patent.number}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono">{patent.date}</span>
                          </div>
                          <div className="text-xs font-medium text-[#111111]">{patent.title}</div>
                        </div>
                        {patent.file_url && (
                          <a
                            href={patent.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-[#F81B00] hover:underline shrink-0 flex items-center gap-1"
                          >
                            <HiOutlineDocumentArrowDown className="w-4 h-4" />
                            Скан
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Футер */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#E2E5EB] bg-[#F9FAFB]">
          <span className="text-[11px] font-mono text-neutral-400">
            Данные верифицированы ФНС и модерацией платформы
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E2E5EB] hover:bg-neutral-300 text-xs font-medium uppercase tracking-wider text-[#111111] transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
