"use client"

import * as React from "react"
import {
  HiXMark,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineBuildingLibrary,
  HiOutlineIdentification,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineArrowRight,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth, AuthModalMode } from "@/lib/auth-context"
import { InnViewExample } from "@/components/dashboard/inn-view-example"

export function AuthModal() {
  const { isModalOpen, modalMode, openModal, closeModal, login, registerInvestor, registerLab } = useAuth()

  // Form states
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")

  // Lab form states
  const [orgName, setOrgName] = React.useState("")
  const [inn, setInn] = React.useState("")
  const [ogrn, setOgrn] = React.useState("")
  const [repName, setRepName] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Reset errors when mode changes
  React.useEffect(() => {
    setError(null)
    setSuccessMsg(null)
  }, [modalMode])

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen, closeModal])

  if (!isModalOpen) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError("Пожалуйста, заполните все поля")
      return
    }
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Ошибка авторизации")
    }
  }

  const handleInvestorRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!fullName || !email || !password) {
      setError("Пожалуйста, заполните все обязательные поля")
      return
    }
    if (password.length < 6) {
      setError("Пароль должен содержать не менее 6 символов")
      return
    }
    setLoading(true)
    const res = await registerInvestor(fullName, email, password)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Ошибка регистрации")
    }
  }

  const handleLabRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleanInn = inn.replace(/\D/g, "")
    const cleanOgrn = ogrn.replace(/\D/g, "")

    if (!orgName || !cleanInn || !cleanOgrn || !repName || !email || !password) {
      setError("Пожалуйста, заполните все поля для регистрации НИИ")
      return
    }
    if (cleanInn.length !== 10 && cleanInn.length !== 12) {
      setError("ИНН организации должен содержать 10 цифр (или 12 для ИП/научных экспертов)")
      return
    }
    if (cleanOgrn.length !== 13 && cleanOgrn.length !== 15) {
      setError("ОГРН организации должен содержать 13 цифр (или 15 для ОГРНИП)")
      return
    }
    if (password.length < 6) {
      setError("Пароль должен содержать не менее 6 символов")
      return
    }

    setLoading(true)
    const res = await registerLab({
      organizationName: orgName,
      inn: cleanInn,
      ogrn: cleanOgrn,
      representativeName: repName,
      email,
      password,
    })
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Ошибка регистрации научной организации")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111111]/60 backdrop-blur-sm transition-opacity"
        onClick={closeModal}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E5EB] overflow-hidden z-10 animate-slide-down">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#E2E5EB] bg-[#F5F6F8]/50">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Точка Роста"
              className="h-8 w-auto object-contain shrink-0"
            />
            <div>
              <h2 className="text-lg font-bold text-[#111111] leading-snug">
                {modalMode === "login"
                  ? "Вход в систему"
                  : modalMode === "register-investor"
                  ? "Регистрация инвестора"
                  : "Регистрация НИИ и лабораторий"}
              </h2>
              <p className="text-xs text-[#6B7280]">
                Единый защищённый доступ к платформе «Точка Роста»
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#E2E5EB] rounded-lg transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <HiXMark className="size-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-[#E2E5EB] bg-[#F5F6F8] p-1.5 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => openModal("login")}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
              modalMode === "login"
                ? "bg-white text-[#111111] shadow-xs font-bold"
                : "text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            Вход
          </button>

          <button
            type="button"
            onClick={() => openModal("register-investor")}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
              modalMode === "register-investor"
                ? "bg-white text-[#111111] shadow-xs font-bold"
                : "text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            Инвестор
          </button>

          <button
            type="button"
            onClick={() => openModal("register-lab")}
            className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer ${
              modalMode === "register-lab"
                ? "bg-white text-[#111111] shadow-xs font-bold"
                : "text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            НИИ / Лаборатория
          </button>
        </div>

        {/* Content body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-[#B91C1C]">
              <div className="font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
              <HiOutlineCheckCircle className="size-5 shrink-0 mt-0.5 text-green-600" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {modalMode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Электронная почта
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="name@company.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                    Пароль
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="default"
                size="lg"
                className="w-full mt-2 font-bold justify-center"
              >
                {loading ? "Выполняется вход..." : "Войти в личный кабинет"}
              </Button>

              <div className="pt-4 border-t border-[#E2E5EB] text-center space-y-2">
                <p className="text-xs text-[#6B7280]">
                  Впервые на платформе?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => openModal("register-investor")}
                    className="text-xs font-semibold text-[#F81B00] hover:underline cursor-pointer"
                  >
                    Регистрация инвестора
                  </button>
                  <span className="text-[#E2E5EB]">•</span>
                  <button
                    type="button"
                    onClick={() => openModal("register-lab")}
                    className="text-xs font-semibold text-[#F81B00] hover:underline cursor-pointer"
                  >
                    Регистрация НИИ
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: INVESTOR REGISTRATION */}
          {modalMode === "register-investor" && (
            <form onSubmit={handleInvestorRegister} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
                <span className="text-xs text-[#6B7280]">Тестовые данные:</span>
                <InnViewExample
                  currentRole="investor"
                  onSelect={(ex) => {
                    setFullName(ex.name)
                    setError(null)
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Ваше имя или наименование инвестора *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    placeholder="Константин Васильев / ООО «ТехноПром»"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineUser className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Электронная почта *
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="investor@domain.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Пароль для входа (от 6 знаков) *
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="text-xs text-[#6B7280]">
                Нажимая кнопку, вы соглашаетесь с условиями работы через защищённый резервный счёт платформы.
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="default"
                size="lg"
                className="w-full mt-2 font-bold justify-center gap-2"
              >
                <span>{loading ? "Создание аккаунта..." : "Зарегистрироваться как Инвестор"}</span>
                <HiOutlineArrowRight className="size-4" />
              </Button>

              <div className="pt-3 border-t border-[#E2E5EB] text-center">
                <button
                  type="button"
                  onClick={() => openModal("login")}
                  className="text-xs font-semibold text-[#6B7280] hover:text-[#111111] cursor-pointer"
                >
                  Уже зарегистрированы? <span className="text-[#F81B00] font-bold">Войти</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LAB / RESEARCH INSTITUTE REGISTRATION */}
          {modalMode === "register-lab" && (
            <form onSubmit={handleLabRegister} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
                <span className="text-xs text-[#6B7280]">Тестовые данные:</span>
                <InnViewExample
                  currentRole="lab"
                  onSelect={(ex) => {
                    setOrgName(ex.name)
                    setInn(ex.inn)
                    setOgrn(ex.ogrn)
                    setRepName(ex.representative)
                    setError(null)
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Название научной организации (НИИ / НИЦ / ВУЗ) *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    placeholder="ФГБУН Институт биофизики СО РАН"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineBuildingLibrary className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                    ИНН организации *
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="7701234567"
                      value={inn}
                      onChange={(e) => setInn(e.target.value)}
                      className="pl-9 bg-[#F5F6F8]"
                    />
                    <HiOutlineIdentification className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-[#6B7280]">10 цифр для юридических лиц</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                    ОГРН *
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="1027700132195"
                      value={ogrn}
                      onChange={(e) => setOgrn(e.target.value)}
                      className="pl-9 bg-[#F5F6F8]"
                    />
                    <HiOutlineIdentification className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-[#6B7280]">13 цифр в реестре ЕГРЮЛ</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  ФИО связующего лица / научного секретаря *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    placeholder="Смирнов Алексей Викторович"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineUser className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
                <span className="text-[10px] text-[#6B7280]">Ответственный за взаимодействие и приёмку задач</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Рабочая электронная почта *
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="science@institute.ras.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                  Пароль (от 6 знаков) *
                </label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-[#F5F6F8]"
                  />
                  <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="dark"
                size="lg"
                className="w-full mt-2 font-bold justify-center gap-2"
              >
                <span>{loading ? "Отправка заявки..." : "Зарегистрировать НИИ в системе"}</span>
                <HiOutlineArrowRight className="size-4" />
              </Button>

              <div className="pt-2 border-t border-[#E2E5EB] text-center">
                <button
                  type="button"
                  onClick={() => openModal("login")}
                  className="text-xs font-semibold text-[#6B7280] hover:text-[#111111] cursor-pointer"
                >
                  Организация уже зарегистрирована? <span className="text-[#F81B00] font-bold">Войти</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
