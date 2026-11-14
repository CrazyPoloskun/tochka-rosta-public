"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineBuildingLibrary,
  HiOutlineIdentification,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { InnViewExample } from "@/components/dashboard/inn-view-example"

type Mode = "login" | "investor" | "lab"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function calculatePasswordStrength(pass: string): {
  score: number
  label: string
  color: string
  badgeVariant: "destructive" | "secondary" | "default"
} {
  if (!pass) {
    return { score: 0, label: "", color: "bg-[#E2E5EB]", badgeVariant: "secondary" }
  }

  let score = 0
  if (pass.length >= 6) score += 1
  if (pass.length >= 8) score += 1
  if (/[0-9]/.test(pass) && /[a-zA-Zа-яА-Я]/.test(pass)) score += 1
  if (/[^a-zA-Z0-9а-яА-Я]/.test(pass) || (pass.length >= 10 && /[A-ZА-Я]/.test(pass))) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: "Слабый", color: "bg-red-500", badgeVariant: "destructive" }
    case 2:
      return { score: 2, label: "Средний", color: "bg-amber-500", badgeVariant: "secondary" }
    case 3:
      return { score: 3, label: "Надёжный", color: "bg-blue-600", badgeVariant: "default" }
    case 4:
      return { score: 4, label: "Очень надёжный", color: "bg-emerald-500", badgeVariant: "default" }
    default:
      return { score: 0, label: "Слишком короткий", color: "bg-red-400", badgeVariant: "destructive" }
  }
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, login, registerInvestor, registerLab } = useAuth()
  const { error: toastError, success: toastSuccess } = useToast()

  const initialMode = (searchParams.get("mode") as Mode) || "login"
  const [mode, setMode] = React.useState<Mode>(
    initialMode === "investor" || initialMode === "lab" ? initialMode : "login"
  )

  React.useEffect(() => {
    if (user) {
      if (user.is_admin) {
        router.replace("/admin")
      } else {
        router.replace("/dashboard")
      }
    }
  }, [user, router])

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Investor fields
  const [fullName, setFullName] = React.useState("")

  // Lab fields
  const [orgName, setOrgName] = React.useState("")
  const [inn, setInn] = React.useState("")
  const [ogrn, setOgrn] = React.useState("")
  const [repName, setRepName] = React.useState("")

  // Terms acceptance
  const [acceptedTerms, setAcceptedTerms] = React.useState(false)

  // Touched state
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  // UI state
  const [loading, setLoading] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)

  const markTouched = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }))
  }

  const errors = React.useMemo(() => {
    const errs: Record<string, string> = {}

    if (mode === "login") {
      if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
        errs.email = "Некорректный email (пример: ivan@domain.ru)"
      }
    } else if (mode === "investor") {
      if (fullName.trim() && fullName.trim().length < 2) {
        errs.fullName = "Минимум 2 символа"
      }
      if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
        errs.email = "Некорректный email (пример: ivan@domain.ru)"
      }
      if (password && password.length < 6) {
        errs.password = "Пароль должен содержать не менее 6 знаков"
      }
    } else if (mode === "lab") {
      if (orgName.trim() && orgName.trim().length < 3) {
        errs.orgName = "Минимум 3 символа"
      }
      const cleanInn = inn.replace(/\D/g, "")
      if (cleanInn && cleanInn.length !== 10 && cleanInn.length !== 12) {
        errs.inn = "ИНН должен состоять из 10 цифр (или 12 для ИП)"
      }
      const cleanOgrn = ogrn.replace(/\D/g, "")
      if (cleanOgrn && cleanOgrn.length !== 13 && cleanOgrn.length !== 15) {
        errs.ogrn = "ОГРН должен состоять из 13 цифр (15 для ОГРНИП)"
      }
      if (repName.trim() && repName.trim().length < 2) {
        errs.repName = "Минимум 2 символа"
      }
      if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
        errs.email = "Некорректный email (пример: science@ras.ru)"
      }
      if (password && password.length < 6) {
        errs.password = "Пароль должен содержать не менее 6 знаков"
      }
    }

    return errs
  }, [mode, email, password, fullName, orgName, inn, ogrn, repName])

  const clearAllFields = () => {
    setEmail("")
    setPassword("")
    setFullName("")
    setOrgName("")
    setInn("")
    setOgrn("")
    setRepName("")
    setAcceptedTerms(false)
    setTouched({})
    setServerError(null)
  }

  React.useEffect(() => {
    clearAllFields()
  }, [])

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    clearAllFields()
  }

  const passwordStrength = calculatePasswordStrength(password)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!isLoginFormValid) return

    setLoading(true)
    const res = await login(email.trim(), password)
    setLoading(false)
    if (!res.success) {
      const errMsg = res.error || "Неверный логин или пароль"
      setServerError(errMsg)
      toastError(errMsg, "Ошибка авторизации")
    } else {
      toastSuccess("Добро пожаловать в личный кабинет!", "Успешный вход")
    }
  }

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!isInvestorFormValid) return

    setLoading(true)
    const res = await registerInvestor(fullName.trim(), email.trim(), password)
    setLoading(false)
    if (!res.success) {
      const errMsg = res.error || "Ошибка при регистрации инвестора"
      setServerError(errMsg)
      toastError(errMsg, "Ошибка регистрации")
    } else {
      toastSuccess("Аккаунт инвестора создан!", "Успешная регистрация")
    }
  }

  const handleLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!isLabFormValid) return

    const cleanInn = inn.replace(/\D/g, "")
    const cleanOgrn = ogrn.replace(/\D/g, "")

    setLoading(true)
    const res = await registerLab({
      organizationName: orgName.trim(),
      inn: cleanInn,
      ogrn: cleanOgrn,
      representativeName: repName.trim(),
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (!res.success) {
      const errMsg = res.error || "Ошибка при регистрации организации"
      setServerError(errMsg)
      toastError(errMsg, "Ошибка регистрации")
    } else {
      toastSuccess("Заявка НИИ отправлена на верификацию модератором!", "Заявка принята")
    }
  }

  const isLoginFormValid = Boolean(
    !loading &&
    email.trim() &&
    EMAIL_REGEX.test(email.trim()) &&
    password
  )

  const isInvestorFormValid = Boolean(
    !loading &&
    fullName.trim().length >= 2 &&
    email.trim() &&
    EMAIL_REGEX.test(email.trim()) &&
    password.length >= 6 &&
    acceptedTerms
  )

  const cleanInn = inn.replace(/\D/g, "")
  const cleanOgrn = ogrn.replace(/\D/g, "")
  const isLabFormValid = Boolean(
    !loading &&
    orgName.trim().length >= 3 &&
    (cleanInn.length === 10 || cleanInn.length === 12) &&
    (cleanOgrn.length === 13 || cleanOgrn.length === 15) &&
    repName.trim().length >= 2 &&
    email.trim() &&
    EMAIL_REGEX.test(email.trim()) &&
    password.length >= 6 &&
    acceptedTerms
  )

  const getInputClass = (fieldName: string, extraPadding = "") => {
    const isInvalid = touched[fieldName] && errors[fieldName]
    return `h-10 text-xs transition-all ${extraPadding} ${
      isInvalid
        ? "!border-red-500 !bg-red-50/20 text-[#111111] focus-visible:!border-red-500 focus-visible:!ring-red-500/20"
        : ""
    }`
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col font-sans selection:bg-[#F81B00] selection:text-white">
      {/* Шапка страницы авторизации */}
      <header className="w-full bg-white border-b border-[#E2E5EB] py-3 px-4 sm:px-8 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Точка Роста"
              className="h-7 w-auto object-contain"
            />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <HiOutlineArrowLeft className="size-3.5" />
            <span>На главную</span>
          </Link>
        </div>
      </header>

      {/* Центральный контейнер формы */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-lg mx-auto">
        <div className="mb-5 flex flex-col items-center text-center animate-slide-down">
          <Link href="/" className="inline-block group" aria-label="На главную «Точка Роста»">
            <img
              src="/logo.png"
              alt="Логотип платформы «Точка Роста»"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Shadcn Tabs для переключения режимов */}
        <div className="w-full mb-3 animate-slide-down">
          <Tabs
            value={mode}
            onValueChange={(val) => switchMode(val as Mode)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
              <TabsTrigger
                value="login"
                className="rounded-lg text-xs font-bold transition-all data-active:bg-[#111111] data-active:text-white cursor-pointer"
              >
                Вход
              </TabsTrigger>
              <TabsTrigger
                value="investor"
                className="rounded-lg text-xs font-bold transition-all data-active:bg-[#111111] data-active:text-white cursor-pointer"
              >
                Инвестор
              </TabsTrigger>
              <TabsTrigger
                value="lab"
                className="rounded-lg text-xs font-bold transition-all data-active:bg-[#111111] data-active:text-white cursor-pointer"
              >
                НИИ / Лаборатория
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Shadcn Card с формой */}
        <Card className="w-full bg-white border border-[#E2E5EB] rounded-2xl shadow-sm p-6 sm:p-7 animate-slide-down gap-0">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-black text-[#111111] tracking-tight">
              {mode === "login"
                ? "Вход в личный кабинет"
                : mode === "investor"
                ? "Регистрация инвестора"
                : "Регистрация научной организации"}
            </CardTitle>
            <CardDescription className="text-xs text-[#6B7280] mt-1">
              {mode === "login"
                ? "Единый доступ для инвесторов, научных сотрудников и кураторов платформы"
                : mode === "investor"
                ? "Для бизнеса, заказчиков исследований и частных инвесторов"
                : "Для институтов РАН, лабораторий и исследовательских центров"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            {/* Shadcn Alert при ошибке */}
            {serverError && (
              <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50/70 p-3">
                <HiOutlineExclamationCircle className="size-4 text-red-600" />
                <AlertTitle className="text-xs font-bold text-red-900">Ошибка</AlertTitle>
                <AlertDescription className="text-xs text-red-700">
                  {serverError}
                </AlertDescription>
              </Alert>
            )}

            {/* =============================================================
               ФОРМА 1: ВХОД
               ============================================================= */}
            {mode === "login" && (
              <form onSubmit={handleLogin} noValidate autoComplete="off" className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[11px] font-bold uppercase text-[#374151]">
                    Электронная почта <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@company.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched("email")}
                      className={getInputClass("email", "pl-9")}
                    />
                    <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {touched.email && errors.email && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.email}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[11px] font-bold uppercase text-[#374151]">
                    Пароль <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched("password")}
                      className={getInputClass("password", "pl-9 pr-9")}
                    />
                    <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#6B7280] hover:text-[#111111] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <HiOutlineEyeSlash className="size-4" /> : <HiOutlineEye className="size-4" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.password}
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!isLoginFormValid}
                  className="w-full mt-2 h-10 text-xs font-bold justify-center gap-2 cursor-pointer bg-[#111111] hover:bg-[#333333] text-white disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Выполняется вход..." : "Войти в личный кабинет"}</span>
                  <HiOutlineArrowRight className="size-4" />
                </Button>

                <div className="pt-3 border-t border-[#E2E5EB] text-center text-xs text-[#6B7280]">
                  Ещё нет аккаунта?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("investor")}
                    className="font-bold text-[#F81B00] hover:underline cursor-pointer"
                  >
                    Зарегистрироваться
                  </button>
                </div>
              </form>
            )}

            {/* =============================================================
               ФОРМА 2: РЕГИСТРАЦИЯ ИНВЕСТОРА
               ============================================================= */}
            {mode === "investor" && (
              <form onSubmit={handleInvestorSubmit} noValidate autoComplete="off" className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <span className="text-xs text-[#6B7280]">Тестовые данные:</span>
                  <InnViewExample
                    currentRole="investor"
                    onSelect={(ex) => {
                      setFullName(ex.name)
                      toastSuccess(`Данные «${ex.name}» подставлены в форму!`, "Пример применён")
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="investor-name" className="text-[11px] font-bold uppercase text-[#374151]">
                    Имя инвестора или наименование компании <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="investor-name"
                      type="text"
                      placeholder="Константин Васильев / ООО «ТехноПром»"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => markTouched("fullName")}
                      className={getInputClass("fullName", "pl-9")}
                    />
                    <HiOutlineUser className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.fullName}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="investor-email" className="text-[11px] font-bold uppercase text-[#374151]">
                    Электронная почта <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="investor-email"
                      type="email"
                      placeholder="investor@domain.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched("email")}
                      className={getInputClass("email", "pl-9")}
                    />
                    <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {touched.email && errors.email && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.email}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="investor-password" className="text-[11px] font-bold uppercase text-[#374151]">
                    Пароль <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="investor-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched("password")}
                      className={getInputClass("password", "pl-9 pr-9")}
                    />
                    <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#6B7280] hover:text-[#111111] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <HiOutlineEyeSlash className="size-4" /> : <HiOutlineEye className="size-4" />}
                    </button>
                  </div>

                  {touched.password && errors.password && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.password}
                    </span>
                  )}

                  {password.length > 0 && (
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#6B7280]">Сложность пароля:</span>
                        <Badge variant={passwordStrength.badgeVariant} className="text-[10px] px-2 py-0">
                          {passwordStrength.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1">
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shadcn Checkbox */}
                <div className="pt-2">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="investor-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                    />
                    <Label
                      htmlFor="investor-terms"
                      className="text-[11px] font-normal text-[#4B5563] leading-snug cursor-pointer select-none"
                    >
                      Я принимаю{" "}
                      <Link
                        href="/legal/terms"
                        target="_blank"
                        className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#F81B00] transition-colors"
                      >
                        условия использования платформы
                      </Link>{" "}
                      и согласен с{" "}
                      <Link
                        href="/legal/privacy"
                        target="_blank"
                        className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#F81B00] transition-colors"
                      >
                        политикой конфиденциальности
                      </Link>
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isInvestorFormValid}
                  className="w-full mt-2 h-10 text-xs font-bold justify-center gap-2 cursor-pointer bg-[#111111] hover:bg-[#333333] text-white disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Создание аккаунта..." : "Зарегистрироваться как Инвестор"}</span>
                  <HiOutlineArrowRight className="size-4" />
                </Button>

                <div className="pt-3 border-t border-[#E2E5EB] text-center text-xs text-[#6B7280]">
                  Уже есть аккаунт?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-bold text-[#F81B00] hover:underline cursor-pointer"
                  >
                    Войти
                  </button>
                </div>
              </form>
            )}

            {/* =============================================================
               ФОРМА 3: РЕГИСТРАЦИЯ НИИ
               ============================================================= */}
            {mode === "lab" && (
              <form onSubmit={handleLabSubmit} noValidate autoComplete="off" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <span className="text-xs text-[#6B7280]">Тестовые данные:</span>
                  <InnViewExample
                    currentRole="lab"
                    onSelect={(ex) => {
                      setOrgName(ex.name)
                      setInn(ex.inn)
                      setOgrn(ex.ogrn)
                      setRepName(ex.representative)
                      toastSuccess(`Реквизиты «${ex.name}» подставлены в форму!`, "Пример применён")
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lab-org" className="text-[11px] font-bold uppercase text-[#374151]">
                    Название научной организации (НИИ / НИЦ / ВУЗ) <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="lab-org"
                      type="text"
                      placeholder="ФГБУН Институт биоорганической химии РАН"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      onBlur={() => markTouched("orgName")}
                      className={getInputClass("orgName", "pl-9")}
                    />
                    <HiOutlineBuildingLibrary className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {touched.orgName && errors.orgName && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.orgName}
                    </span>
                  )}
                </div>

                {/* ИНН и ОГРН */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lab-inn" className="text-[11px] font-bold uppercase text-[#374151]">
                      ИНН <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lab-inn"
                        type="text"
                        maxLength={12}
                        placeholder="7701234567"
                        value={inn}
                        onChange={(e) => setInn(e.target.value)}
                        onBlur={() => markTouched("inn")}
                        className={getInputClass("inn", "pl-9")}
                      />
                      <HiOutlineIdentification className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {touched.inn && errors.inn && (
                      <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                        {errors.inn}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lab-ogrn" className="text-[11px] font-bold uppercase text-[#374151]">
                      ОГРН <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lab-ogrn"
                        type="text"
                        maxLength={15}
                        placeholder="1027700132195"
                        value={ogrn}
                        onChange={(e) => setOgrn(e.target.value)}
                        onBlur={() => markTouched("ogrn")}
                        className={getInputClass("ogrn", "pl-9")}
                      />
                      <HiOutlineIdentification className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {touched.ogrn && errors.ogrn && (
                      <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                        {errors.ogrn}
                      </span>
                    )}
                  </div>
                </div>

                {/* Представитель и почта */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lab-rep" className="text-[11px] font-bold uppercase text-[#374151]">
                      ФИО связующего лица <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lab-rep"
                        type="text"
                        placeholder="Смирнов Алексей Викторович"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        onBlur={() => markTouched("repName")}
                        className={getInputClass("repName", "pl-9")}
                      />
                      <HiOutlineUser className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {touched.repName && errors.repName && (
                      <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                        {errors.repName}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lab-email" className="text-[11px] font-bold uppercase text-[#374151]">
                      Рабочая почта <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lab-email"
                        type="email"
                        placeholder="science@ras.ru"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => markTouched("email")}
                        className={getInputClass("email", "pl-9")}
                      />
                      <HiOutlineEnvelope className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {touched.email && errors.email && (
                      <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Пароль */}
                <div className="space-y-1.5">
                  <Label htmlFor="lab-password" className="text-[11px] font-bold uppercase text-[#374151]">
                    Пароль <span className="text-[#F81B00] font-bold ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="lab-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched("password")}
                      className={getInputClass("password", "pl-9 pr-9")}
                    />
                    <HiOutlineLockClosed className="size-4 text-[#6B7280] absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#6B7280] hover:text-[#111111] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <HiOutlineEyeSlash className="size-4" /> : <HiOutlineEye className="size-4" />}
                    </button>
                  </div>

                  {touched.password && errors.password && (
                    <span className="text-[11px] font-medium text-red-600 block animate-slide-down">
                      {errors.password}
                    </span>
                  )}

                  {password.length > 0 && (
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#6B7280]">Сложность пароля:</span>
                        <Badge variant={passwordStrength.badgeVariant} className="text-[10px] px-2 py-0">
                          {passwordStrength.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1">
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                        <div className={`rounded-full transition-all duration-200 ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-[#E2E5EB]"}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shadcn Checkbox */}
                <div className="pt-2">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="lab-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                    />
                    <Label
                      htmlFor="lab-terms"
                      className="text-[11px] font-normal text-[#4B5563] leading-snug cursor-pointer select-none"
                    >
                      Я принимаю{" "}
                      <Link
                        href="/legal/terms"
                        target="_blank"
                        className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#F81B00] transition-colors"
                      >
                        условия использования платформы
                      </Link>{" "}
                      и согласен с{" "}
                      <Link
                        href="/legal/privacy"
                        target="_blank"
                        className="text-[#111111] font-semibold underline underline-offset-2 hover:text-[#F81B00] transition-colors"
                      >
                        политикой конфиденциальности
                      </Link>
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isLabFormValid}
                  className="w-full mt-2 h-10 text-xs font-bold justify-center gap-2 cursor-pointer bg-[#111111] hover:bg-[#333333] text-white disabled:cursor-not-allowed"
                >
                  <span>{loading ? "Отправка заявки..." : "Зарегистрировать НИИ в системе"}</span>
                  <HiOutlineArrowRight className="size-4" />
                </Button>

                <div className="pt-2.5 border-t border-[#E2E5EB] text-center text-xs text-[#6B7280]">
                  Организация уже зарегистрирована?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-bold text-[#F81B00] hover:underline cursor-pointer"
                  >
                    Войти
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AuthPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
          <div className="size-8 border-3 border-[#F81B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthForm />
    </React.Suspense>
  )
}
