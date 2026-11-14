"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineArrowRight,
  HiOutlineChevronDown,
  HiOutlineCubeTransparent,
  HiOutlineBeaker,
  HiOutlineBuildingLibrary,
  HiOutlineShieldCheck,
  HiOutlineHeart,
  HiOutlineBriefcase,
  HiOutlineLightBulb,
  HiOutlineUser,
  HiOutlineUserPlus,
  HiOutlineDocumentPlus,
  HiOutlineChatBubbleLeftRight,
  HiOutlineLockClosed,
  HiOutlineBuildingOffice2,
  HiOutlineDocumentCheck,
  HiOutlineMagnifyingGlassCircle,
  HiOutlineBanknotes,
  HiCheckBadge,
  HiOutlineFingerPrint,
  HiOutlineChatBubbleOvalLeftEllipsis,
  HiOutlineLifebuoy,
  HiOutlineScale,
  HiOutlineDocumentText,
  HiOutlineArrowRightOnRectangle,
  HiBars3,
  HiXMark,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { SwissGraphic } from "@/components/ui/swiss-graphic"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { useAuth } from "@/lib/auth-context"

export default function Home() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = React.useState<"investors" | "labs">("investors")
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111111] font-sans antialiased flex flex-col selection:bg-[#F81B00] selection:text-white">
      
      {/* =========================================================================
         ШАПКА САЙТА (Header)
         - Слева: только графический логотип (без текста)
         - По центру: вкладки с плавной нижней полоской
         - Справа: навигация и кнопка «Войти»
         ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E2E5EB] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            
            {/* Слева: Графический логотип */}
            <div className="flex items-center shrink-0">
              <a href="#" className="flex items-center group" aria-label="Главная">
                <img
                  src="/logo.png"
                  alt="Логотип платформы"
                  className="h-8 w-auto object-contain"
                />
              </a>
            </div>

            {/* По центру: Переключатель аудитории с плавной акцентной полоской */}
            <div className="hidden md:flex items-center gap-8 h-full">
              <button
                type="button"
                onClick={() => setActiveTab("investors")}
                className={`h-full inline-flex items-center text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === "investors"
                    ? "border-[#F81B00] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111] hover:border-zinc-300"
                }`}
              >
                Инвесторам и донорам
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("labs")}
                className={`h-full inline-flex items-center text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  activeTab === "labs"
                    ? "border-[#F81B00] text-[#111111]"
                    : "border-transparent text-[#6B7280] hover:text-[#111111] hover:border-zinc-300"
                }`}
              >
                НИИ и лабораториям
              </button>
            </div>

            {/* Справа: Ссылки навигации и кнопка «Войти» */}
            <div className="hidden lg:flex items-center gap-6">
              <nav className="flex items-center gap-6 text-sm font-medium text-[#4B5563]">
                <a href="#formats" className="hover:text-[#F81B00] transition-colors">
                  О платформе
                </a>
                <a href="#moderation" className="hover:text-[#F81B00] transition-colors">
                  Модерация
                </a>
                <a href="#security" className="hover:text-[#F81B00] transition-colors">
                  Безопасность
                </a>
                <a href="#support" className="hover:text-[#F81B00] transition-colors">
                  Поддержка
                </a>
                <Link href="/legal" className="hover:text-[#F81B00] transition-colors">
                  Документы
                </Link>
              </nav>

              {user ? (
                <Link
                  href={user.is_admin ? "/admin" : "/dashboard"}
                  className="flex items-center justify-center size-10 rounded-xl bg-white border border-[#E2E5EB] text-[#111111] hover:text-[#F81B00] hover:border-[#111111]/30 hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                  title={user.is_admin ? "Панель управления (/admin)" : "Личный кабинет"}
                  aria-label={user.is_admin ? "Панель управления" : "Личный кабинет"}
                >
                  <HiOutlineUser className="size-5" />
                </Link>
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
            <div className="flex lg:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#111111] hover:bg-[#ECEEF2] rounded-lg transition-colors cursor-pointer active:scale-95"
                aria-label="Меню"
              >
                {mobileMenuOpen ? <HiXMark className="size-6" /> : <HiBars3 className="size-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Мобильное меню */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E2E5EB] bg-white px-4 pt-4 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-2 border-b border-[#E2E5EB] pb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("investors")
                  setMobileMenuOpen(false)
                }}
                className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors ${
                  activeTab === "investors"
                    ? "bg-[#111111] text-white"
                    : "bg-[#F5F6F8] text-[#6B7280]"
                }`}
              >
                Инвесторам
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("labs")
                  setMobileMenuOpen(false)
                }}
                className={`py-2 text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors ${
                  activeTab === "labs"
                    ? "bg-[#111111] text-white"
                    : "bg-[#F5F6F8] text-[#6B7280]"
                }`}
              >
                Лабораториям
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <a
                href="#formats"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              >
                О платформе
              </a>
              <a
                href="#moderation"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              >
                Модерация
              </a>
              <a
                href="#security"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              >
                Безопасность
              </a>
              <a
                href="#support"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              >
                Поддержка
              </a>
              <Link
                href="/legal"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#111111] hover:bg-[#F5F6F8] rounded-lg transition-colors"
              >
                Документы
              </Link>
            </nav>

            <div className="pt-2 border-t border-[#E2E5EB]">
              {user ? (
                <Link
                  href={user.is_admin ? "/admin" : "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F5F6F8] border border-[#E2E5EB] text-[#111111] hover:border-[#111111]/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-white border border-[#E2E5EB] flex items-center justify-center text-[#111111]">
                      <HiOutlineUser className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111111]">
                        {user.is_admin ? "Панель управления" : "Личный кабинет"}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate max-w-[200px]">
                        {user.full_name || user.email}
                      </p>
                    </div>
                  </div>
                  <HiOutlineArrowRight className="size-4 text-[#6B7280]" />
                </Link>
              ) : (
                <Link href="/auth?mode=login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full gap-2 font-bold cursor-pointer"
                  >
                    <span>Войти</span>
                    <HiOutlineArrowRightOnRectangle className="size-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
         ОСНОВНОЙ КОНТЕНТ
         ========================================================================= */}
      <main className="flex-1 animate-slide-down">

        {/* ---------------------------------------------------------------------
           БЛОК 1: Первый экран (Hero — сбалансированный текст, графика сдвинута вправо)
           --------------------------------------------------------------------- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-18">
          <div key={activeTab} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {activeTab === "investors" ? (
              <>
                {/* Вариант А: Инвесторам и донорам */}
                <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.12] animate-slide-down">
                    Финансируйте научные разработки <span className="text-[#F81B00]">без риска потери бюджета</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed max-w-xl font-normal animate-slide-down-delay-1">
                    Платформа объединяет бизнес, частных доноров и исследовательские институты. Вы финансируете исследования или запускаете производство своих идей. Оплата исполнителю переводится только после успешной проверки образца.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 animate-slide-down-delay-2">
                    <Link href={user ? "/dashboard" : "/auth?mode=investor"}>
                      <Button
                        variant="default"
                        size="lg"
                        className="font-bold gap-2 px-7 h-12 text-sm sm:text-base shadow-sm cursor-pointer"
                      >
                        <span>{user ? "В личный кабинет" : "Регистрация"}</span>
                        <HiOutlineArrowRight className="size-4" />
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="lg"
                      className="font-semibold gap-2 px-7 h-12 text-sm sm:text-base border-[#E2E5EB] hover:border-zinc-400"
                      onClick={() => {
                        const el = document.getElementById("formats")
                        el?.scrollIntoView({ behavior: "smooth" })
                      }}
                    >
                      <span>Подробнее</span>
                      <HiOutlineChevronDown className="size-4 text-[#6B7280]" />
                    </Button>
                  </div>
                </div>

                {/* Правая колонка: Графика сдвинута чуть вправо от текста */}
                <div className="lg:col-span-6 flex items-center justify-center lg:justify-end lg:pl-10 xl:pl-14 pointer-events-none select-none animate-slide-down-delay-1">
                  <SwissGraphic variant="investors" />
                </div>
              </>
            ) : (
              <>
                {/* Вариант Б: НИИ и лабораториям */}
                <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.12] animate-slide-down">
                    Привлекайте деньги бизнеса и гранты <span className="text-[#F81B00]">на прикладные разработки</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed max-w-xl font-normal animate-slide-down-delay-1">
                    Берите в работу реальные задачи от предприятий или находите финансирование под свои проекты. Платформа фиксирует авторские права, утверждает смету и гарантирует оплату каждого этапа.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 animate-slide-down-delay-2">
                    <Link href={user ? "/dashboard" : "/auth?mode=lab"}>
                      <Button
                        variant="default"
                        size="lg"
                        className="font-bold gap-2 px-7 h-12 text-sm sm:text-base shadow-sm cursor-pointer"
                      >
                        <span>{user ? "В личный кабинет" : "Регистрация НИИ"}</span>
                        <HiOutlineBuildingLibrary className="size-4" />
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="lg"
                      className="font-semibold gap-2 px-7 h-12 text-sm sm:text-base border-[#E2E5EB] hover:border-zinc-400"
                      onClick={() => {
                        const el = document.getElementById("moderation")
                        el?.scrollIntoView({ behavior: "smooth" })
                      }}
                    >
                      <span>Регламент</span>
                      <HiOutlineShieldCheck className="size-4 text-[#6B7280]" />
                    </Button>
                  </div>
                </div>

                {/* Правая колонка: Графика сдвинута чуть вправо от текста */}
                <div className="lg:col-span-6 flex items-center justify-center lg:justify-end lg:pl-10 xl:pl-14 pointer-events-none select-none animate-slide-down-delay-1">
                  <SwissGraphic variant="labs" />
                </div>
              </>
            )}

          </div>
        </section>

        {/* ---------------------------------------------------------------------
           БЛОК 2: Направления деятельности (Большие иконки на месте вверху)
           --------------------------------------------------------------------- */}
        <section id="formats" className="bg-white border-y border-[#E2E5EB] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            
            <ScrollReveal direction="down" distance={16} className="max-w-3xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                Форматы взаимодействия на платформе
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                Единый правовой и финансовый контур для ученых, инвесторов и доноров.
              </p>
            </ScrollReveal>

            {/* Карточки с большими иконками на своем месте (вверху) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Формат 1 */}
              <ScrollReveal delay={0} direction="down" distance={16} className="h-full">
                <div className="bg-[#F5F6F8] border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 h-full flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineHeart className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Пожертвования на науку
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Прямая поддержка фундаментальных исследований и лабораторий. Прозрачные финансовые отчеты публикуются в личном кабинете.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Формат 2 */}
              <ScrollReveal delay={120} direction="down" distance={16} className="h-full">
                <div className="bg-[#F5F6F8] border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 h-full flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineBriefcase className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Контрактный заказ R&D
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Целевое финансирование прикладных разработок под ключ. Исключительные права на полученные патенты закрепляются за вами.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Формат 3 */}
              <ScrollReveal delay={240} direction="down" distance={16} className="h-full">
                <div className="bg-[#F5F6F8] border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 h-full flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineLightBulb className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Реализация идей бизнеса
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Опишите производственную задачу. Профильный институт разработает решение, согласует прозрачную смету и защитит патент.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* ---------------------------------------------------------------------
           БЛОК 3: Регламент работы и поэтапная модерация
           --------------------------------------------------------------------- */}
        <section id="moderation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <ScrollReveal direction="down" distance={16} className="max-w-3xl space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Порядок работы и модерации
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
              Допуск участников к совершению операций и публикация материалов осуществляются после обязательной проверки модераторами платформы.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Столбец 1: Порядок действий для инвестора и донора */}
            <ScrollReveal delay={80} direction="down" distance={16} className="h-full">
              <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 space-y-7 shadow-xs h-full">
              <div className="pb-4 border-b border-[#E2E5EB]">
                <h3 className="text-xl font-bold text-[#111111]">
                  Порядок действий для инвестора и донора
                </h3>
              </div>

              {/* Цепочка этапов со связующей линией */}
              <div className="relative space-y-7 before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#E2E5EB]">
                
                {/* Шаг 1 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#F81B00] flex items-center justify-center text-[#F81B00] shrink-0 font-extrabold text-xs shadow-xs">
                    01
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineUserPlus className="size-6 text-[#F81B00] shrink-0" />
                      <span>Регистрация в системе</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Создание аккаунта физического лица для пожертвований или юридического лица для контрактного заказа R&D.
                    </p>
                  </div>
                </div>

                {/* Шаг 2 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#F81B00] flex items-center justify-center text-[#F81B00] shrink-0 font-extrabold text-xs shadow-xs">
                    02
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineDocumentPlus className="size-6 text-[#F81B00] shrink-0" />
                      <span>Выбор проекта или публикация идеи</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Выбор готового исследования из каталога либо размещение собственной задачи с направлением в профильные институты.
                    </p>
                  </div>
                </div>

                {/* Шаг 3 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#F81B00] flex items-center justify-center text-[#F81B00] shrink-0 font-extrabold text-xs shadow-xs">
                    03
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineChatBubbleLeftRight className="size-6 text-[#F81B00] shrink-0" />
                      <span>Согласование условий в чате</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Обсуждение технического задания, контрольных точек, прозрачной сметы и отчетности в защищенном чате.
                    </p>
                  </div>
                </div>

                {/* Шаг 4 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#F81B00] flex items-center justify-center text-[#F81B00] shrink-0 font-extrabold text-xs shadow-xs">
                    04
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineLockClosed className="size-6 text-[#F81B00] shrink-0" />
                      <span>Депонирование на резервном счёте</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Перевод средств на специальный защищенный счет. Оплата исполнителю переводится поэтапно только после приёмки работ.
                    </p>
                  </div>
                </div>

              </div>
            </div>
            </ScrollReveal>

            {/* Столбец 2: Порядок действий для НИИ и лаборатории */}
            <ScrollReveal delay={200} direction="down" distance={16} className="h-full">
              <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 space-y-7 shadow-xs h-full">
                <div className="pb-4 border-b border-[#E2E5EB]">
                <h3 className="text-xl font-bold text-[#111111]">
                  Порядок действий для НИИ и лаборатории
                </h3>
              </div>

              {/* Цепочка этапов со связующей линией */}
              <div className="relative space-y-7 before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#E2E5EB]">
                
                {/* Шаг 1 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] shrink-0 font-extrabold text-xs shadow-xs">
                    01
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineBuildingOffice2 className="size-6 text-[#F81B00] shrink-0" />
                      <span>Регистрация и верификация</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Подача заявки от лица научной организации с предоставлением уставных документов и реквизитов.
                    </p>
                  </div>
                </div>

                {/* Шаг 2 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] shrink-0 font-extrabold text-xs shadow-xs">
                    02
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineDocumentCheck className="size-6 text-[#F81B00] shrink-0" />
                      <span>Подготовка проекта и сметы</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Оформление собственной разработки или принятие задачи инвестора с утверждением поэтапного бюджета.
                    </p>
                  </div>
                </div>

                {/* Шаг 3 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] shrink-0 font-extrabold text-xs shadow-xs">
                    03
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineMagnifyingGlassCircle className="size-6 text-[#F81B00] shrink-0" />
                      <span>Экспертиза и патентная чистота</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Проверка сметы экспертами платформы, подтверждение патентной чистоты и фиксация авторского приоритета.
                    </p>
                  </div>
                </div>

                {/* Шаг 4 */}
                <div className="relative flex items-start gap-4">
                  <div className="relative z-10 size-10 rounded-full bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] shrink-0 font-extrabold text-xs shadow-xs">
                    04
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <h4 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                      <HiOutlineBanknotes className="size-6 text-[#F81B00] shrink-0" />
                      <span>Сдача этапов и получение оплаты</span>
                    </h4>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Выполнение работ по графику, передача образцов и отчетов, гарантированный перевод средств с резервного счёта.
                    </p>
                  </div>
                </div>

              </div>
            </div>
            </ScrollReveal>

          </div>
        </section>

        {/* ---------------------------------------------------------------------
           БЛОК 4: Безопасность (Чистые блоки БЕЗ ИКОНОК и БЕЗ щита)
           --------------------------------------------------------------------- */}
        <section id="security" className="bg-white border-y border-[#E2E5EB] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            
            <ScrollReveal direction="down" distance={16} className="max-w-3xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                Гарантии безопасности и контроль исполнения
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                Каждая сделка структурирована по нормам законодательства с полной защитой коммерческой тайны и результатов интеллектуальной деятельности.
              </p>
            </ScrollReveal>

            {/* Сетка из 4 карточек с большими иконками */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Блок 1 */}
              <ScrollReveal delay={0} direction="down" distance={16} className="h-full">
                <div className="p-6 sm:p-7 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineLockClosed className="size-9" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Расчёты через резервный счёт
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Финансовые средства резервируются на счете до сдачи контрольного этапа, гарантируя оплату исполнителю и сохранность средств инвестору.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Блок 2 */}
              <ScrollReveal delay={90} direction="down" distance={16} className="h-full">
                <div className="p-6 sm:p-7 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiCheckBadge className="size-9" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Обязательная верификация НИИ
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Проверка правового статуса, лабораторной базы и подлинности патентной документации научной организации до начала сбора средств.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Блок 3 */}
              <ScrollReveal delay={180} direction="down" distance={16} className="h-full">
                <div className="p-6 sm:p-7 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineFingerPrint className="size-9" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Фиксация интеллектуальных прав
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Все идеи инвесторов и научные описания регистрируются с криптографической меткой времени, защищая авторство сторон.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Блок 4 */}
              <ScrollReveal delay={270} direction="down" distance={16} className="h-full">
                <div className="p-6 sm:p-7 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-white border border-[#E2E5EB] flex items-center justify-center text-[#F81B00] shadow-xs">
                      <HiOutlineChatBubbleOvalLeftEllipsis className="size-9" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Защищённый чат участников
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Вся деловая переписка и изменения по проекту ведутся во встроенном мессенджере с сохранением юридически значимой истории.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* ---------------------------------------------------------------------
           БЛОК 5: Служба поддержки (Большие иконки на месте вверху)
           --------------------------------------------------------------------- */}
        <section id="support" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="space-y-10">
            
            <ScrollReveal direction="down" distance={16} className="max-w-3xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                Сопровождение и служба поддержки
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                Служба поддержки платформы обеспечивает экспертное и организационное сопровождение пользователей на всех стадиях взаимодействия.
              </p>
            </ScrollReveal>

            {/* Карточки поддержки с большими иконками вверху */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Плашка 1 */}
              <ScrollReveal delay={0} direction="down" distance={16} className="h-full">
                <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center text-[#F81B00]">
                      <HiOutlineLifebuoy className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Консультационная поддержка
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Быстрые ответы по регистрации, верификации проектов и правилам работы с резервным счётом.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Плашка 2 */}
              <ScrollReveal delay={120} direction="down" distance={16} className="h-full">
                <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center text-[#F81B00]">
                      <HiOutlineScale className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Независимый арбитраж
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Помощь в объективной технической оценке этапов и быстрое разрешение любых спорных вопросов.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Плашка 3 */}
              <ScrollReveal delay={240} direction="down" distance={16} className="h-full">
                <div className="bg-white border border-[#E2E5EB] rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#111111]/30 hover:shadow-xs transition-all duration-150 h-full group">
                  <div className="space-y-4">
                    <div className="size-16 rounded-2xl bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center text-[#F81B00]">
                      <HiOutlineDocumentText className="size-9" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] leading-snug group-hover:text-[#F81B00] transition-colors duration-150">
                      Методическое сопровождение
                    </h3>
                    <p className="text-sm text-[#4B5563] leading-relaxed">
                      Помощь заказчикам в структурировании технических задач, а институтам — в расчёте смет и фиксации патентов.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

            </div>

          </div>
        </section>

        {/* ---------------------------------------------------------------------
           БЛОК 6: Призыв к регистрации (CTA)
           --------------------------------------------------------------------- */}
        <section className="bg-white border-t border-[#E2E5EB] py-16 sm:py-20">
          <ScrollReveal direction="down" distance={16} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight">
              Начните работу на платформе
            </h2>
            <p className="text-base sm:text-lg text-[#4B5563] max-w-2xl mx-auto leading-relaxed">
              Полный доступ к базе исследований, бирже технологических идей и инструментам финансирования открывается после регистрации.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href={user ? "/dashboard" : "/auth?mode=investor"} className="w-full sm:w-auto">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto font-bold gap-2 px-8 shadow-sm hover:shadow transition-all group cursor-pointer"
                >
                  <span>{user ? "В личный кабинет" : "Инвесторам"}</span>
                  <HiOutlineArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link href={user ? "/dashboard" : "/auth?mode=lab"} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-bold gap-2 px-8 hover:border-zinc-400 transition-all cursor-pointer"
                >
                  <span>{user ? "Кабинет организации" : "Научным организациям"}</span>
                  <HiOutlineBuildingLibrary className="size-5 text-[#F81B00]" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </section>

      </main>

      {/* =========================================================================
         БЛОК 7: Подвал (Footer — БЕЗ ЛОГОТИПА, с регламентами)
         ========================================================================= */}
      <footer className="bg-[#111111] text-zinc-400 text-xs py-12 border-t border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Описание платформы */}
            <div className="md:col-span-5 space-y-3">
              <span className="font-bold text-white text-sm tracking-wide block">
                Платформа R&D финансирования
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                Платформа безопасного финансирования научных исследований и технологических разработок с гарантией расчётов через резервный счёт.
              </p>
            </div>

            {/* Навигация */}
            <div className="md:col-span-3 space-y-3">
              <span className="font-bold text-white text-xs tracking-wider uppercase block">
                Навигация
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("investors")
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Инвесторам и донорам
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("labs")
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    НИИ и лабораториям
                  </button>
                </li>
                <li>
                  <a href="#moderation" className="hover:text-white transition-colors">
                    Порядок модерации
                  </a>
                </li>
                <li>
                  <a href="#support" className="hover:text-white transition-colors">
                    Служба поддержки
                  </a>
                </li>
              </ul>
            </div>

            {/* Правовые документы и регламенты */}
            <div className="md:col-span-4 space-y-3">
              <Link href="/legal" className="group flex items-center justify-between">
                <span className="font-bold text-white text-xs tracking-wider uppercase group-hover:text-[#F81B00] transition-colors">
                  Правовые документы и регламенты
                </span>
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  Все документы →
                </span>
              </Link>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/legal/moderation" className="hover:text-white transition-colors block">
                    Регламент модерации проектов и заявок
                  </Link>
                </li>
                <li>
                  <Link href="/legal/escrow" className="hover:text-white transition-colors block">
                    Правила расчётов через резервный счёт
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className="hover:text-white transition-colors block">
                    Пользовательское соглашение
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="hover:text-white transition-colors block">
                    Политика конфиденциальности и защиты данных
                  </Link>
                </li>
                <li>
                  <Link href="/legal/intellectual-property" className="hover:text-white transition-colors block">
                    Регламент фиксации прав на РИД и патенты
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
            <div>
              © 2026. Все права защищены.
            </div>
            <div>
              Единый стандарт защищённых расчетов и модерации R&D.
            </div>
          </div>

        </div>
      </footer>

    </div>
  )
}
