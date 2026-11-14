"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineScale,
  HiOutlineFingerPrint,
  HiOutlineShare,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineInformationCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCheck
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/data/legal-docs"

export function DocIcon({ slug, className = "size-5 shrink-0 text-[#F81B00]" }: { slug: string; className?: string }) {
  switch (slug) {
    case "moderation":
      return <HiOutlineShieldCheck className={className} />
    case "escrow":
      return <HiOutlineLockClosed className={className} />
    case "terms":
      return <HiOutlineDocumentText className={className} />
    case "privacy":
      return <HiOutlineScale className={className} />
    case "intellectual-property":
      return <HiOutlineFingerPrint className={className} />
    default:
      return <HiOutlineDocumentText className={className} />
  }
}

export function getDocIcon(slug: string) {
  return <DocIcon slug={slug} />
}

/**
 * Единый Header для страниц правовых документов
 */
export function LegalHeader() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E5EB] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Слева: Логотип и ссылка на главную */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center group" aria-label="На главную «Точка Роста»">
              <img
                src="/logo.png"
                alt="Логотип платформы"
                className="h-8 w-auto object-contain"
              />
            </Link>

            <div className="hidden sm:flex items-center pl-4 border-l border-[#E2E5EB] text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
              Документы
            </div>
          </div>

          {/* По центру / Справа: Навигация */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-[#4B5563] hover:text-[#111111] transition-colors flex items-center gap-1.5"
            >
              <HiOutlineArrowLeft className="size-4" />
              <span>Главная</span>
            </Link>

            <Link
              href="/legal"
              className="text-sm font-semibold text-[#4B5563] hover:text-[#111111] transition-colors"
            >
              Все документы
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button variant="default" size="default" className="gap-2 font-bold shadow-xs">
                    <span>Личный кабинет</span>
                    <HiOutlineArrowRight className="size-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-xs text-[#6B7280] hover:text-[#111111]"
                >
                  Выйти
                </Button>
              </div>
            ) : (
              <Link href="/auth?mode=login">
                <Button
                  variant="dark"
                  size="default"
                  className="gap-2 font-semibold group cursor-pointer"
                >
                  <span>Войти</span>
                  <HiOutlineArrowRightOnRectangle className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Мобильная кнопка меню */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#111111] hover:bg-[#ECEEF2] rounded-lg transition-colors cursor-pointer"
              aria-label="Меню"
            >
              {mobileMenuOpen ? <HiOutlineXMark className="size-6" /> : <HiOutlineBars3 className="size-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E5EB] bg-white px-4 pt-4 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg"
          >
            <HiOutlineArrowLeft className="size-4 text-[#F81B00]" />
            <span>Вернуться на главную</span>
          </Link>

          <Link
            href="/legal"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg"
          >
            Все документы
          </Link>

          <div className="pt-2 border-t border-[#E2E5EB]">
            {user ? (
              <div className="space-y-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="lg" className="w-full gap-2 font-bold">
                    <span>Личный кабинет</span>
                    <HiOutlineArrowRight className="size-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-xs text-[#6B7280]"
                >
                  Выйти из системы
                </Button>
              </div>
            ) : (
              <Link href="/auth?mode=login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full gap-2 font-bold cursor-pointer"
                >
                  <span>Войти в систему</span>
                  <HiOutlineArrowRightOnRectangle className="size-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/**
 * Единый Footer для правовых страниц
 */
export function LegalFooter() {
  return (
    <footer className="bg-[#111111] text-zinc-400 text-xs py-12 border-t border-[#222222] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-5 space-y-3">
            <span className="font-bold text-white text-sm tracking-wide block">
              Платформа R&D финансирования «Точка Роста»
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Платформа безопасного финансирования научных исследований и технологических разработок с гарантией расчётов через резервный счёт.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <span className="font-bold text-white text-xs tracking-wider uppercase block">
              Навигация
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Главная страница
                </Link>
              </li>
              <li>
                <Link href="/#formats" className="hover:text-white transition-colors">
                  Форматы взаимодействия
                </Link>
              </li>
              <li>
                <Link href="/#moderation" className="hover:text-white transition-colors">
                  Порядок модерации
                </Link>
              </li>
              <li>
                <Link href="/#security" className="hover:text-white transition-colors">
                  Безопасность расчётов
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <span className="font-bold text-white text-xs tracking-wider uppercase block">
              Правовые документы и регламенты
            </span>
            <ul className="space-y-2 text-xs">
              {LEGAL_DOCUMENTS.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/legal/${doc.slug}`}
                    className="hover:text-white transition-colors block"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div>
            © 2026 ООО «Точка Роста Технологии». Все права защищены.
          </div>
          <div>
            Единый стандарт защищённых расчетов и модерации R&D.
          </div>
        </div>

      </div>
    </footer>
  )
}

/**
 * Боковая панель: только правовая поддержка
 */
export function LegalSidebar() {
  return (
    <aside className="space-y-6">
      {/* Карточка юридической консультации */}
      <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 text-sm font-bold text-[#111111]">
          <div className="size-8 rounded-lg bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center text-[#F81B00]">
            <HiOutlineScale className="size-5" />
          </div>
          <span>Правовая поддержка</span>
        </div>
        <p className="text-xs text-[#4B5563] leading-relaxed">
          Возникли вопросы по договору, регламентам или оформлению прав? Свяжитесь с юридической службой платформы.
        </p>
        <div className="pt-2 border-t border-[#E2E5EB]">
          <a
            href="mailto:legal@tochkarosta.ru"
            className="text-xs font-bold text-[#F81B00] hover:underline block"
          >
            legal@tochkarosta.ru
          </a>
        </div>
      </div>
    </aside>
  )
}

/**
 * Просмотрщик правового документа со всеми секциями и действиями
 */
export function LegalDocViewer({ doc }: { doc: LegalDocument }) {
  const [copied, setCopied] = React.useState(false)
  const [scrollProgress, setScrollProgress] = React.useState(0)

  React.useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100
        setScrollProgress(Math.min(100, Math.max(0, progress)))
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111111] font-sans antialiased flex flex-col selection:bg-[#F81B00] selection:text-white">
      {/* Красная полоска прогресса прочтения страницы */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-[#F81B00] transition-[width] duration-75 ease-out shadow-[0_0_8px_rgba(248,27,0,0.5)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <LegalHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Хлебные крошки */}
          <nav className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
            <Link href="/" className="hover:text-[#111111] transition-colors">
              Главная
            </Link>
            <span>/</span>
            <Link href="/legal" className="hover:text-[#111111] transition-colors">
              Документы
            </Link>
            <span>/</span>
            <span className="text-[#111111] font-medium truncate max-w-[200px] sm:max-w-md">
              {doc.shortTitle}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Левая колонка: Сам документ */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Шапка документа */}
              <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
                
                <div className="flex items-center justify-between gap-3 border-b border-[#E2E5EB] pb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                    <DocIcon slug={doc.slug} className="size-5 text-[#F81B00]" />
                    <span>Официальный документ</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B5563] bg-[#F5F6F8] hover:bg-[#ECEEF2] border border-[#E2E5EB] rounded-lg transition-colors cursor-pointer"
                    title="Скопировать ссылку"
                  >
                    {copied ? (
                      <>
                        <HiOutlineCheck className="size-4 text-emerald-600" />
                        <span className="text-emerald-600">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <HiOutlineShare className="size-4" />
                        <span>Поделиться</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight leading-snug">
                    {doc.title}
                  </h1>
                  <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                    {doc.description}
                  </p>
                </div>

                {/* Метаданные документа: дата редакции и время */}
                <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[#E2E5EB] text-xs">
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Дата редакции</span>
                    <span className="font-semibold text-[#111111]">{doc.effectiveDate}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[11px]">Время прочтения</span>
                    <span className="font-semibold text-[#111111]">~{doc.readingTime}</span>
                  </div>
                </div>

              </div>

              {/* Содержимое секций документа */}
              <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-10 space-y-10 shadow-xs">
                {doc.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                    <h2 className="text-lg sm:text-xl font-bold text-[#111111] border-b border-[#E2E5EB] pb-2">
                      {section.title}
                    </h2>

                    <div className="space-y-3 text-sm text-[#374151] leading-relaxed">
                      {section.content.map((paragraph, pIdx) => (
                        <p key={pIdx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Выделенный блок уведомления */}
                    {section.notice && (
                      <div
                        className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 border ${
                          section.notice.type === "warning"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : section.notice.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-[#F5F6F8] border-[#E2E5EB] text-[#111111]"
                        }`}
                      >
                        {section.notice.type === "warning" && (
                          <HiOutlineExclamationTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                        )}
                        {section.notice.type === "success" && (
                          <HiOutlineCheckCircle className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                        )}
                        {section.notice.type === "info" && (
                          <HiOutlineInformationCircle className="size-5 shrink-0 text-[#F81B00] mt-0.5" />
                        )}
                        <div className="font-medium leading-relaxed">
                          {section.notice.text}
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>

            </div>

            {/* Правая колонка: Фиксированная боковая панель с правовой поддержкой */}
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <LegalSidebar />
            </div>

          </div>

        </div>
      </main>

      <LegalFooter />
    </div>
  )
}
