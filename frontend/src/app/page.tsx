"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  Layers,
  Zap,
  Play,
  Send,
  TrendingUp,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  Sparkles,
  Building2,
  FlaskConical,
  CheckCircle2,
  Heart,
  Briefcase,
  Lightbulb,
  FileCheck,
  Scale,
  Menu,
  User as UserIcon,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/* ───────────── КОНСТАНТЫ И ПАЛИТРА ───────────── */

const RED = "#E30613";

const navLinks = [
  { label: "Исследования", href: "#research" },
  { label: "Форматы", href: "#formats" },
  { label: "Регламент", href: "#moderation" },
  { label: "Безопасность", href: "#security" },
  { label: "Документы", href: "/legal" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Проверенные исследования",
    text: "Индекс доверия лабораторий, аудит смет и прозрачные метрики",
  },
  {
    icon: Layers,
    title: "Поэтапный контроль",
    text: "Эскроу-механика, защита бюджета и понятный трекер выполнения",
  },
  {
    icon: Zap,
    title: "Доступ к экспертизе",
    text: "ИИ-аналитика отчётов, научная оценка и патентная чистота",
  },
];

const cards = [
  {
    tag: "Новые материалы",
    score: "98.7",
    title: "Разработка умных полимеров",
    org: "ТулГУ",
    pct: 72,
    gradient: "from-blue-600/20 via-indigo-500/10 to-transparent",
    accentColor: "#3B82F6",
    type: "polymer",
  },
  {
    tag: "Биотех",
    score: "96.1",
    title: "Генная терапия редких заболеваний",
    org: "МГУ им. М.В. Ломоносова",
    pct: 41,
    gradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
    accentColor: "#10B981",
    type: "biotech",
  },
  {
    tag: "ИИ и данные",
    score: "95.8",
    title: "Нейросетевые модели для медицины",
    org: "СПбГУ",
    pct: 23,
    gradient: "from-purple-600/20 via-pink-500/10 to-transparent",
    accentColor: "#8B5CF6",
    type: "ai",
  },
];

const steps = [
  {
    t: "Выберите проект",
    d: "Изучите исследования, смету и оцените коммерческий потенциал",
  },
  {
    t: "Поддержите через эскроу",
    d: "Средства депонируются на счете и переводятся по факту приемки",
  },
  {
    t: "Следите за прогрессом",
    d: "Получайте подтвержденные отчеты, образцы и патентные права",
  },
];

const moderationStepsInvestor = [
  {
    step: "01",
    title: "Регистрация в системе",
    desc: "Создание аккаунта физического лица для пожертвований или юридического лица для контрактного заказа R&D.",
  },
  {
    step: "02",
    title: "Выбор проекта или публикация идеи",
    desc: "Выбор готового исследования из каталога либо размещение собственной задачи с направлением в профильные институты.",
  },
  {
    step: "03",
    title: "Согласование сметы и эскроу",
    desc: "Фиксация этапов, сроков и депонирование средств на защищенном эскроу-счете до приемки образцов.",
  },
  {
    step: "04",
    title: "Приемка результатов и отчетность",
    desc: "Проверка опытных образцов, передача научно-технической документации и выплата вознаграждения.",
  },
];

const moderationStepsLab = [
  {
    step: "01",
    title: "Верификация НИИ / Лаборатории",
    desc: "Проверка уставных документов, состава исследовательской группы и аккредитации оборудования.",
  },
  {
    step: "02",
    title: "Публикация программы разработки",
    desc: "Размещение паспорта исследования, календарного плана работ, сметы расходов и ожидаемых результатов.",
  },
  {
    step: "03",
    title: "Заключение трехстороннего соглашения",
    desc: "Юридическое закрепление условий финансирования, патентных прав и критериев успешности этапов.",
  },
  {
    step: "04",
    title: "Поэтапное финансирование",
    desc: "Разблокировка средств с эскроу-счета по мере сдачи и утверждения каждого этапа заказчиком.",
  },
];

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: "Эскроу-контроль бюджета",
    desc: "Деньги инвестора замораживаются в защищенном контуре и перечисляются исполнителю только после подтверждения сдачи этапа.",
  },
  {
    icon: Scale,
    title: "Патентная чистота и права",
    desc: "Юридическая фиксация авторских прав и передача исключительных прав заказчику в рамках трехсторонних соглашений.",
  },
  {
    icon: FileCheck,
    title: "Экспертная верификация",
    desc: "Проверка лабораторных отчетов, образцов и протоколов независимыми отраслевыми экспертами и ИИ-системой.",
  },
  {
    icon: ExternalLink,
    title: "Реестр подлинности /verify",
    desc: "Цифровой реестр хэшей документов и отчетов платформы. Мгновенная проверка подлинности любого свидетельства.",
    link: "/verify",
  },
];

/* ───────────── SVG-ДЕКОР ДЛЯ КАРТОЧЕК ИССЛЕДОВАНИЙ ───────────── */

function CardGraphic({ type }: { type: string }) {
  if (type === "polymer") {
    return (
      <svg className="w-full h-full opacity-60" viewBox="0 0 200 120" fill="none">
        <polygon points="100,20 140,45 140,90 100,115 60,90 60,45" stroke="#3B82F6" strokeWidth="1.5" fill="#3B82F6" fillOpacity="0.08" />
        <polygon points="140,45 180,68 180,110 140,135 100,115 140,90" stroke="#3B82F6" strokeWidth="1.2" strokeDasharray="3 3" fill="#3B82F6" fillOpacity="0.04" />
        <polygon points="60,45 100,20 100,65 60,90 20,68 20,25" stroke="#3B82F6" strokeWidth="1.2" strokeDasharray="3 3" fill="#3B82F6" fillOpacity="0.04" />
        <circle cx="100" cy="20" r="3.5" fill="#E30613" />
        <circle cx="140" cy="45" r="3.5" fill="#3B82F6" />
        <circle cx="140" cy="90" r="3.5" fill="#3B82F6" />
        <circle cx="100" cy="115" r="3.5" fill="#3B82F6" />
        <circle cx="60" cy="90" r="3.5" fill="#3B82F6" />
        <circle cx="60" cy="45" r="3.5" fill="#3B82F6" />
      </svg>
    );
  }
  if (type === "biotech") {
    return (
      <svg className="w-full h-full opacity-60" viewBox="0 0 200 120" fill="none">
        <path d="M40 20 Q100 60 160 20" stroke="#10B981" strokeWidth="2" fill="none" />
        <path d="M40 100 Q100 60 160 100" stroke="#10B981" strokeWidth="2" fill="none" />
        <line x1="60" y1="35" x2="60" y2="85" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="80" y1="48" x2="80" y2="72" stroke="#E30613" strokeWidth="1.5" />
        <line x1="100" y1="60" x2="100" y2="60" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="48" x2="120" y2="72" stroke="#E30613" strokeWidth="1.5" />
        <line x1="140" y1="35" x2="140" y2="85" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
        <circle cx="80" cy="48" r="3" fill="#E30613" />
        <circle cx="120" cy="72" r="3" fill="#E30613" />
      </svg>
    );
  }
  return (
    <svg className="w-full h-full opacity-60" viewBox="0 0 200 120" fill="none">
      <circle cx="45" cy="40" r="5" fill="#8B5CF6" />
      <circle cx="45" cy="80" r="5" fill="#8B5CF6" />
      <circle cx="100" cy="25" r="5" fill="#8B5CF6" />
      <circle cx="100" cy="60" r="6" fill="#E30613" />
      <circle cx="100" cy="95" r="5" fill="#8B5CF6" />
      <circle cx="155" cy="40" r="5" fill="#8B5CF6" />
      <circle cx="155" cy="80" r="5" fill="#8B5CF6" />
      <line x1="45" y1="40" x2="100" y2="25" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="45" y1="40" x2="100" y2="60" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="45" y1="80" x2="100" y2="60" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="45" y1="80" x2="100" y2="95" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="100" y1="25" x2="155" y2="40" stroke="#8B5CF6" strokeWidth="1.2" />
      <line x1="100" y1="60" x2="155" y2="40" stroke="#E30613" strokeWidth="1.5" />
      <line x1="100" y1="60" x2="155" y2="80" stroke="#E30613" strokeWidth="1.5" />
      <line x1="100" y1="95" x2="155" y2="80" stroke="#8B5CF6" strokeWidth="1.2" />
    </svg>
  );
}

/* ───────────── МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ ───────────── */

type AuthRole = "all" | "investor" | "lab";

const authRoles: { id: AuthRole; label: string; icon: typeof Sparkles }[] = [
  { id: "all", label: "Вход", icon: Sparkles },
  { id: "investor", label: "Инвестор", icon: Building2 },
  { id: "lab", label: "НИИ / Лаборатория", icon: FlaskConical },
];

function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  initialRole = "all",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  initialRole?: AuthRole;
}) {
  const router = useRouter();
  const { login, registerInvestor, registerLab } = useAuth();

  const [role, setRole] = React.useState<AuthRole>(initialRole);
  const [mode, setMode] = React.useState<"login" | "register">(initialMode);
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [inn, setInn] = React.useState("");
  const [ogrn, setOgrn] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode);
    setRole(initialRole);
    setErrorMessage(null);
  }, [initialMode, initialRole, isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const res = await login(email.trim(), password);
        if (res.success) {
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            onClose();
            // Проверяем админский логин или ведем в кабинет
            if (email.trim().toLowerCase().includes("admin")) {
              router.push("/admin");
            } else {
              router.push("/dashboard");
            }
          }, 600);
        } else {
          setErrorMessage(res.error || "Неверный адрес электронной почты или пароль");
          setIsSubmitting(false);
        }
      } else {
        // Регистрация
        if (role === "lab") {
          const res = await registerLab({
            organizationName: name.trim() || "Научно-исследовательский институт",
            inn: inn.trim() || "7700000000",
            ogrn: ogrn.trim() || "1000000000000",
            representativeName: name.trim() || "Руководитель лаборатории",
            email: email.trim(),
            password,
          });
          if (res.success) {
            setIsSuccess(true);
            setTimeout(() => {
              setIsSuccess(false);
              onClose();
              router.push("/dashboard");
            }, 600);
          } else {
            setErrorMessage(res.error || "Ошибка при регистрации лаборатории");
            setIsSubmitting(false);
          }
        } else {
          // Инвестор или общий пользователь
          const res = await registerInvestor(
            name.trim() || "Инвестор платформы",
            email.trim(),
            password
          );
          if (res.success) {
            setIsSuccess(true);
            setTimeout(() => {
              setIsSuccess(false);
              onClose();
              router.push("/dashboard");
            }, 600);
          } else {
            setErrorMessage(res.error || "Ошибка при создании аккаунта инвестора");
            setIsSubmitting(false);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Произошла непредвиденная ошибка");
      setIsSubmitting(false);
    }
  };

  const getSubtitle = () => {
    if (mode === "register") {
      return "Создайте аккаунт для доступа к проектам, грантам и технологическому партнёрству";
    }
    switch (role) {
      case "investor":
        return "Вход в инвестиционный кабинет: сделки, аналитика и венчурные проекты";
      case "lab":
        return "Кабинет научной организации: управление заявками на гранты и исследования";
      default:
        return "Единый доступ для инвесторов, научных сотрудников и кураторов платформы";
    }
  };

  const getEmailPlaceholder = () => {
    switch (role) {
      case "investor":
        return "investor@venture-fund.ru";
      case "lab":
        return "lab@university.edu.ru";
      default:
        return "name@company.ru";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Переключатель роли */}
        <div className="mb-3 flex justify-center">
          <div className="inline-flex rounded-full bg-white/90 p-1 shadow-md border border-black/5 backdrop-blur-md">
            {authRoles.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setErrorMessage(null);
                    if (r.id !== "all") {
                      // При выборе инвестора или лаборатории сохраняем режим
                    }
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[#111] text-white shadow-sm"
                      : "text-black/60 hover:text-black"
                  }`}
                >
                  <Icon size={13} className={active ? "text-[#E30613]" : ""} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Главная карточка с формой */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-white/95 p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.22),0_0_40px_rgba(227,6,19,0.06)] border border-white backdrop-blur-2xl">
          {/* Деликатный градиентный блик в углу */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent blur-2xl"
            aria-hidden="true"
          />

          {/* Кнопка закрытия */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-4 top-4 sm:right-5 sm:top-5 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-black/55 transition-all hover:bg-black/[0.08] hover:text-black hover:rotate-90 active:scale-95 cursor-pointer"
          >
            <X size={15} />
          </button>

          {/* Заголовок карточки */}
          <div className="pr-6">
            <h2 className="text-[22px] sm:text-[24px] font-extrabold tracking-tight text-[#111]">
              {mode === "login" ? "Вход в личный кабинет" : "Регистрация аккаунта"}
            </h2>
            <p className="mt-2 text-[12px] sm:text-[13px] leading-snug text-black/55 min-h-[34px]">
              {getSubtitle()}
            </p>
          </div>

          {/* Блок ошибки */}
          {errorMessage && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Дополнительное поле при регистрации */}
            {mode === "register" && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-[10px] font-bold tracking-wider text-black/70">
                  {role === "lab"
                    ? "НАЗВАНИЕ ЛАБОРАТОРИИ / НИИ"
                    : role === "investor"
                    ? "НАЗВАНИЕ ФОНДА ИЛИ ВАШЕ ИМЯ"
                    : "ИМЯ ИЛИ ОРГАНИЗАЦИЯ"}{" "}
                  <span style={{ color: RED }}>*</span>
                </label>
                <div className="group relative flex items-center rounded-2xl bg-[#f4f5f7] border border-black/[0.06] transition-all focus-within:border-[#E30613] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10">
                  <span className="pl-4 text-black/40 group-focus-within:text-[#E30613] transition-colors">
                    <Building2 size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      role === "lab"
                        ? "Лаборатория квантовых материалов"
                        : "ООО «Венчурные инвестиции»"
                    }
                    className="w-full bg-transparent py-3 pl-3 pr-4 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Электронная почта */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-wider text-black/70">
                ЭЛЕКТРОННАЯ ПОЧТА <span style={{ color: RED }}>*</span>
              </label>
              <div className="group relative flex items-center rounded-2xl bg-[#f4f5f7] border border-black/[0.06] transition-all focus-within:border-[#E30613] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10">
                <span className="pl-4 text-black/40 group-focus-within:text-[#E30613] transition-colors">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={getEmailPlaceholder()}
                  className="w-full bg-transparent py-3 pl-3 pr-4 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
                />
              </div>
            </div>

            {/* Пароль */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold tracking-wider text-black/70">
                  ПАРОЛЬ <span style={{ color: RED }}>*</span>
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        "Для восстановления доступа свяжитесь со службой поддержки или администратором."
                      )
                    }
                    className="text-[10px] font-semibold text-black/45 hover:text-[#E30613] transition-colors cursor-pointer"
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>
              <div className="group relative flex items-center rounded-2xl bg-[#f4f5f7] border border-black/[0.06] transition-all focus-within:border-[#E30613] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10">
                <span className="pl-4 text-black/40 group-focus-within:text-[#E30613] transition-colors">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 pl-3 pr-11 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  className="absolute right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-black/40 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Запомнить меня */}
            {mode === "login" && (
              <label className="flex items-center gap-2.5 pt-0.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-black/20 accent-[#E30613] cursor-pointer"
                />
                <span className="text-[11px] font-medium text-black/60">
                  Запомнить меня на этом устройстве
                </span>
              </label>
            )}

            {/* Кнопка отправки формы */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="group relative flex h-[46px] sm:h-[48px] w-full items-center justify-center gap-3 rounded-full bg-[#111] px-6 text-[13px] font-semibold text-white shadow-[0_10px_24px_-6px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-[#E30613] hover:shadow-[0_12px_28px_-6px_rgba(227,6,19,0.55)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75"
              >
                {isSuccess ? (
                  <span className="flex items-center gap-2 text-white animate-in zoom-in-90 duration-200">
                    <CheckCircle2 size={16} /> Успешно! Переход...
                  </span>
                ) : isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Выполняется вход...
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === "login" ? "Войти в личный кабинет" : "Создать аккаунт"}
                    </span>
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Переключение Вход / Регистрация */}
          <div className="mt-6 pt-5 border-t border-black/[0.08] text-center">
            {mode === "login" ? (
              <p className="text-[12px] text-black/60">
                Ещё нет аккаунта?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#E30613] hover:underline cursor-pointer"
                >
                  Зарегистрироваться
                </button>
              </p>
            ) : (
              <p className="text-[12px] text-black/60">
                Уже зарегистрированы?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#E30613] hover:underline cursor-pointer"
                >
                  Войти в кабинет
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── КОМПОНЕНТЫ ИНТЕРФЕЙСА ЛЕНДИНГА ───────────── */

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <svg
        width="32"
        height="32"
        viewBox="0 0 30 30"
        fill="none"
        aria-hidden
        className="transition-transform group-hover:scale-105"
      >
        <path d="M4 12 18 4v8L4 20z" fill={RED} />
        <path d="M12 26 26 18v-8L12 18z" fill="#111" />
        <path d="M4 22 12 18v8l-8 4z" fill={RED} />
      </svg>
      <span className="text-[15px] font-extrabold leading-[1.05] tracking-tight text-black">
        Точка
        <br />
        Роста
      </span>
    </Link>
  );
}

function Media3D({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  return (
    <video
      className={`pointer-events-none select-none object-contain mix-blend-multiply ${className}`}
      style={{
        filter: "brightness(1.08) contrast(1.08)",
        WebkitMaskImage: "radial-gradient(ellipse at center, #000 50%, transparent 76%)",
        maskImage: "radial-gradient(ellipse at center, #000 50%, transparent 76%)",
      }}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={poster}
    >
      <source src={`${src}.mp4`} type="video/mp4" />
    </video>
  );
}

/* ───────────── ДЕСКТОП: ШАПКА ───────────── */

function Header({
  onOpenAuth,
  loggedIn,
  isAdmin,
}: {
  onOpenAuth: (mode?: "login" | "register", role?: AuthRole) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-12 xl:gap-16">
          <Logo />
          <nav className="hidden gap-7 text-[13px] font-medium text-black/75 lg:flex">
            {navLinks.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="transition-colors hover:text-[#E30613]"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              const el = document.getElementById("research");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label="Поиск по проектам"
            title="Поиск исследований"
            className="flex h-9 w-[46px] items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/60 transition-all hover:text-black hover:border-black/30 cursor-pointer"
          >
            <Search size={14} />
          </button>

          {loggedIn ? (
            <button
              onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")}
              className="flex h-10 items-center gap-2 rounded-full bg-[#111] px-5 text-[12px] font-semibold text-white transition-all hover:bg-black hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <UserIcon size={14} className="text-[#E30613]" />
              <span>{isAdmin ? "Панель управления" : "Личный кабинет"}</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth("login", "all")}
                className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-[12px] font-semibold text-[#111] transition-all hover:bg-white hover:border-black/25 cursor-pointer"
              >
                Войти
              </button>
              <button
                onClick={() => onOpenAuth("register", "investor")}
                className="flex h-10 items-center gap-2 rounded-full bg-[#111] px-5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-[#E30613] hover:shadow-[0_8px_20px_-6px_rgba(227,6,19,.5)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Регистрация</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ───────────── ДЕСКТОП: ПЕРВЫЙ ЭКРАН (HERO) ───────────── */

function Hero({
  onOpenAuth,
  loggedIn,
  isAdmin,
}: {
  onOpenAuth: (mode?: "login" | "register", role?: AuthRole) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#eeeff1] via-[#f3f3f5] to-[#f7f7f8]">
      <section className="relative mx-auto max-w-[1200px] px-6 pb-12 pt-14 lg:min-h-[540px] flex flex-col justify-center">
        <div className="relative z-10 max-w-[580px]">
          {/* Бейдж */}
          <span className="inline-flex items-center gap-3 rounded-full border border-black/5 bg-white/80 px-5 py-2.5 text-[11px] font-medium leading-tight text-black/75 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: RED }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: RED }}
              />
            </span>
            Платформа финансирования научных разработок
          </span>

          {/* Заголовок */}
          <h1 className="mt-8 text-[44px] font-extrabold leading-[1.03] tracking-tight text-[#1e1e22] md:text-[50px]">
            Привлекайте деньги бизнеса и гранты{" "}
            <span style={{ color: RED }}>на прикладные разработки</span>
          </h1>

          {/* Описание */}
          <p className="mt-6 max-w-[460px] text-[15px] leading-[1.5] text-black/65 font-normal">
            Единая экосистема, где наука встречается с венчурным капиталом и производством.
            Прозрачное эскроу-финансирование, защита авторских прав и гарантированные результаты.
          </p>

          {/* Кнопки действий */}
          <div className="mt-9 flex items-center gap-4">
            {loggedIn ? (
              <button
                onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")}
                className="flex h-[44px] items-center gap-3 rounded-full px-7 text-[13px] font-semibold text-white shadow-[0_10px_24px_-6px_rgba(227,6,19,.5)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                style={{ background: RED }}
              >
                <span>{isAdmin ? "В панель управления" : "В личный кабинет"}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth("register", "investor")}
                className="flex h-[44px] items-center gap-3 rounded-full px-7 text-[13px] font-semibold text-white shadow-[0_10px_24px_-6px_rgba(227,6,19,.5)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                style={{ background: RED }}
              >
                <span>Зарегистрироваться</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              onClick={() => {
                const el = document.getElementById("formats");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex h-[44px] items-center gap-3 rounded-full border border-black/10 bg-white/70 px-6 text-[13px] font-semibold text-[#111] transition-all hover:bg-white hover:border-black/25 active:scale-98 cursor-pointer"
            >
              <span>Узнать больше</span>
              <Play size={10} fill={RED} stroke={RED} className="ml-0.5" />
            </button>
          </div>
        </div>

        {/* 3D молекула (видео) */}
        <Media3D
          src="/3d/molecule"
          poster="/3d/molecule.webp"
          className="absolute right-[-40px] top-4 z-0 hidden h-[480px] w-[620px] lg:block"
        />

        {/* Индекс доверия */}
        <div className="absolute right-6 top-10 z-20 hidden items-center gap-3.5 rounded-[22px] bg-white/85 px-5 py-3 shadow-[0_12px_32px_-10px_rgba(0,0,0,.15)] border border-white/60 backdrop-blur-md lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E30613]">
            <TrendingUp size={20} color={RED} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-black/55">
              Индекс доверия НИИ
            </div>
            <div className="text-[24px] font-extrabold leading-none tracking-tight text-[#111]">
              98.7 <span className="text-[11px] font-bold" style={{ color: RED }}>↗ 99.1%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────────── ПРЕИМУЩЕСТВА (FEATURES) ───────────── */

function Features() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="grid gap-8 border-b border-black/5 pb-10 md:grid-cols-3 md:gap-0">
        {features.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className={`flex items-start gap-4 md:px-8 ${
              i ? "md:border-l md:border-black/10" : "md:pl-0"
            }`}
          >
            <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,.12)] border border-black/5">
              <Icon size={22} color={RED} strokeWidth={1.8} />
            </span>
            <div>
              <h3 className="text-[15px] font-bold leading-tight text-[#111]">{title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-black/60">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── АКТУАЛЬНЫЕ ИССЛЕДОВАНИЯ (RESEARCH) ───────────── */

function Research({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: "login" | "register") => void;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = React.useState(0);

  const handleCatalogClick = () => {
    if (loggedIn) {
      router.push("/dashboard");
    } else {
      onOpenAuth("register");
    }
  };

  return (
    <section id="research" className="mx-auto grid max-w-[1200px] items-start gap-10 px-6 py-12 lg:grid-cols-[260px_1fr]">
      <div>
        <i className="mb-5 block h-[3px] w-[32px] rounded-full" style={{ background: RED }} />
        <h2 className="text-[28px] font-extrabold leading-[1.08] tracking-tight text-[#111]">
          Актуальные
          <br />
          исследования
        </h2>
        <p className="mt-4 text-[13px] leading-relaxed text-black/60">
          Выберите перспективный проект из каталога и инвестируйте в его реализацию с защитой прав.
        </p>

        <button
          onClick={handleCatalogClick}
          className="mt-8 inline-flex h-[42px] items-center gap-3 rounded-full bg-[#111] px-6 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-black hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>Перейти в каталог</span>
          <ArrowRight size={13} />
        </button>

        <div className="mt-10 flex items-center gap-4 text-[12px]">
          <span className="font-semibold">
            <b>0{activeSlide + 1}</b>{" "}
            <span className="text-black/40">/ 0{cards.length}</span>
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : cards.length - 1))}
              aria-label="Назад"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white transition-all hover:border-black/30 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setActiveSlide((prev) => (prev < cards.length - 1 ? prev + 1 : 0))}
              aria-label="Далее"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white transition-all hover:border-black/30 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="grid gap-5 sm:grid-cols-3">
          {cards.map((c) => (
            <article
              key={c.title}
              onClick={handleCatalogClick}
              className="group overflow-hidden rounded-[24px] border border-black/5 bg-white/90 shadow-[0_12px_32px_-18px_rgba(0,0,0,.18)] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,.22)] hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative h-[160px] bg-gradient-to-b from-[#f2f3f5] to-white p-3 flex items-center justify-center overflow-hidden">
                <CardGraphic type={c.type} />
                <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold text-black/75 shadow-xs border border-black/5">
                  {c.tag}
                </span>
                <span className="absolute right-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold shadow-xs border border-black/5">
                  <TrendingUp size={11} color={RED} /> {c.score}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-bold leading-snug text-[#111] group-hover:text-[#E30613] transition-colors">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] font-medium text-black/50">{c.org}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/[0.06]">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-black/50">Прогресс финансирования</span>
                    <span className="font-bold text-[#111]">{c.pct}%</span>
                  </div>
                  <div className="h-[4px] w-full rounded-full bg-black/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${c.pct}%`, background: RED }}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── ФОРМАТЫ ВЗАИМОДЕЙСТВИЯ (FORMATS) ───────────── */

function FormatsSection({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: "login" | "register", role?: AuthRole) => void;
  loggedIn: boolean;
}) {
  const router = useRouter();

  const handleAction = (role: AuthRole) => {
    if (loggedIn) {
      router.push("/dashboard");
    } else {
      onOpenAuth("register", role);
    }
  };

  return (
    <section id="formats" className="bg-white border-y border-black/5 py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-6 space-y-12">
        <div className="max-w-2xl space-y-3">
          <i className="block h-[3px] w-[32px] rounded-full" style={{ background: RED }} />
          <h2 className="text-[30px] sm:text-[34px] font-extrabold tracking-tight text-[#111]">
            Форматы взаимодействия на платформе
          </h2>
          <p className="text-[14px] sm:text-[15px] text-black/60 leading-relaxed">
            Единый правовой, финансовый и технологический контур для ученых, инвесторов и производственных предприятий.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Формат 1 */}
          <div className="rounded-[28px] border border-black/5 bg-[#F7F7F8] p-7 flex flex-col justify-between hover:border-black/20 hover:shadow-sm transition-all group">
            <div className="space-y-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-black/5 text-[#E30613]">
                <Heart size={24} />
              </span>
              <h3 className="text-[18px] font-bold text-[#111] leading-snug group-hover:text-[#E30613] transition-colors">
                Пожертвования на науку
              </h3>
              <p className="text-[13px] text-black/60 leading-relaxed">
                Прямая поддержка фундаментальных исследований и профильных лабораторий. Прозрачные финансовые отчеты и публикации в личном кабинете.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleAction("investor")}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#111] hover:text-[#E30613] transition-colors cursor-pointer"
              >
                <span>Поддержать проект</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Формат 2 */}
          <div className="rounded-[28px] border border-black/5 bg-[#F7F7F8] p-7 flex flex-col justify-between hover:border-black/20 hover:shadow-sm transition-all group">
            <div className="space-y-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-black/5 text-[#E30613]">
                <Briefcase size={24} />
              </span>
              <h3 className="text-[18px] font-bold text-[#111] leading-snug group-hover:text-[#E30613] transition-colors">
                Контрактный заказ R&D
              </h3>
              <p className="text-[13px] text-black/60 leading-relaxed">
                Целевое финансирование прикладных разработок под ключ. Исключительные права на полученные патенты закрепляются за вашей организацией.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleAction("investor")}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#111] hover:text-[#E30613] transition-colors cursor-pointer"
              >
                <span>Заказать разработку</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Формат 3 */}
          <div className="rounded-[28px] border border-black/5 bg-[#F7F7F8] p-7 flex flex-col justify-between hover:border-black/20 hover:shadow-sm transition-all group">
            <div className="space-y-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-black/5 text-[#E30613]">
                <Lightbulb size={24} />
              </span>
              <h3 className="text-[18px] font-bold text-[#111] leading-snug group-hover:text-[#E30613] transition-colors">
                Реализация идей бизнеса
              </h3>
              <p className="text-[13px] text-black/60 leading-relaxed">
                Опишите производственную задачу. Профильный институт разработает решение, согласует прозрачную смету и защитит патент.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleAction("lab")}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#111] hover:text-[#E30613] transition-colors cursor-pointer"
              >
                <span>Предложить задачу</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── ПОРЯДОК РАБОТЫ И МОДЕРАЦИЯ (MODERATION) ───────────── */

function ModerationSection() {
  const [tab, setTab] = React.useState<"investors" | "labs">("investors");
  const currentSteps = tab === "investors" ? moderationStepsInvestor : moderationStepsLab;

  return (
    <section id="moderation" className="max-w-[1200px] mx-auto px-6 py-16 sm:py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl space-y-3">
          <i className="block h-[3px] w-[32px] rounded-full" style={{ background: RED }} />
          <h2 className="text-[30px] sm:text-[34px] font-extrabold tracking-tight text-[#111]">
            Порядок работы и модерация
          </h2>
          <p className="text-[14px] text-black/60 leading-relaxed">
            Допуск участников к операциям и публикация материалов осуществляются после обязательной проверки аккредитованными экспертами.
          </p>
        </div>

        {/* Переключатель табов */}
        <div className="inline-flex rounded-full bg-[#ECEEF2] p-1 self-start md:self-auto border border-black/5">
          <button
            onClick={() => setTab("investors")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              tab === "investors"
                ? "bg-[#111] text-white shadow-xs"
                : "text-black/60 hover:text-black"
            }`}
          >
            Инвесторам и спонсорам
          </button>
          <button
            onClick={() => setTab("labs")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              tab === "labs"
                ? "bg-[#111] text-white shadow-xs"
                : "text-black/60 hover:text-black"
            }`}
          >
            НИИ и лабораториям
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentSteps.map((s) => (
          <div
            key={s.step}
            className="rounded-[24px] border border-black/5 bg-white p-6 shadow-[0_10px_26px_-15px_rgba(0,0,0,.1)] flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-xs"
                style={{ background: RED }}
              >
                {s.step}
              </span>
              <h3 className="text-[15px] font-bold text-[#111] leading-snug">{s.title}</h3>
              <p className="text-[12px] text-black/60 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── БЕЗОПАСНОСТЬ И ЭСКРОУ (SECURITY) ───────────── */

function SecuritySection() {
  return (
    <section id="security" className="bg-[#eeeff1]/60 border-t border-black/5 py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-6 space-y-12">
        <div className="max-w-2xl space-y-3">
          <i className="block h-[3px] w-[32px] rounded-full" style={{ background: RED }} />
          <h2 className="text-[30px] sm:text-[34px] font-extrabold tracking-tight text-[#111]">
            Безопасность сделок и правовой контур
          </h2>
          <p className="text-[14px] text-black/60 leading-relaxed">
            Встроенные защитные механизмы защищают бюджет инвестора и исключительные авторские права исследователей.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-[24px] border border-black/5 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-black/20 transition-all"
              >
                <div className="space-y-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E30613]">
                    <Icon size={20} />
                  </span>
                  <h3 className="text-[15px] font-bold text-[#111]">{f.title}</h3>
                  <p className="text-[12px] text-black/60 leading-relaxed">{f.desc}</p>
                </div>
                {f.link && (
                  <Link
                    href={f.link}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E30613] hover:underline pt-2"
                  >
                    <span>Открыть реестр</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────── ДЕСКТОП: ПРИЗЫВ К ДЕЙСТВИЮ (CTA) ───────────── */

function CTA({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: "login" | "register") => void;
  loggedIn: boolean;
}) {
  const router = useRouter();

  const handleAction = () => {
    if (loggedIn) {
      router.push("/dashboard");
    } else {
      onOpenAuth("register");
    }
  };

  return (
    <section className="relative isolate overflow-hidden">
      {/* Баннер с колбой (десктоп) */}
      <Image
        src="/3d/colb-baner.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover object-center"
      />

      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 py-24 lg:min-h-[480px] lg:grid-cols-[1fr_460px_1fr]">
        <div className="relative z-10">
          <i className="mb-5 block h-[3px] w-[32px] rounded-full" style={{ background: RED }} />
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-tight text-[#111]">
            Открывайте будущее вместе <span style={{ color: RED }}>с наукой</span>
          </h2>
          <p className="mt-6 text-[14px] leading-snug text-black/60">
            Поддержите исследования
            <br />
            или станьте партнёром инновационных проектов
          </p>
          <button
            onClick={handleAction}
            className="mt-9 inline-flex h-[44px] items-center gap-4 rounded-full px-7 text-[12px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(227,6,19,.6)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            style={{ background: RED }}
          >
            <span>{loggedIn ? "В личный кабинет" : "Стать партнёром"}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div aria-hidden className="hidden lg:block" />

        <ol className="relative z-10 space-y-9 lg:pl-6">
          <span
            className="absolute left-[13px] top-4 h-[calc(100%-32px)] w-px bg-black/15"
            aria-hidden
          />
          {steps.map((s, i) => (
            <li key={s.t} className="relative flex gap-5">
              <span
                className={`z-10 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-xs ${
                  i ? "border border-black/10 bg-white text-black" : "text-white"
                }`}
                style={i ? undefined : { background: RED }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[14px] font-semibold text-[#111]">{s.t}</h3>
                <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-black/55">
                  {s.d}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── ДЕСКТОП: ФУТЕР (FOOTER) ───────────── */

function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-black/[0.06]">
          <Logo />
          <nav className="flex flex-wrap gap-6 text-[12px] font-medium text-black/75">
            {navLinks.map((n) => (
              <a key={n.label} href={n.href} className="hover:text-[#E30613] transition-colors">
                {n.label}
              </a>
            ))}
            <Link href="/verify" className="hover:text-[#E30613] transition-colors font-semibold">
              Реестр /verify
            </Link>
          </nav>

          <div className="flex gap-3">
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white hover:border-black/30 transition-colors"
            >
              <Send size={14} />
            </a>
            <a
              href="https://vk.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VK"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[11px] font-bold hover:border-black/30 transition-colors"
            >
              VK
            </a>
          </div>
        </div>

        {/* Юридические документы платформы */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-black/50">
          <div className="flex flex-wrap gap-5">
            <Link href="/legal/terms" className="hover:text-black transition-colors">
              Пользовательское соглашение
            </Link>
            <Link href="/legal/privacy" className="hover:text-black transition-colors">
              Конфиденциальность
            </Link>
            <Link href="/legal/escrow" className="hover:text-black transition-colors">
              Регламент эскроу
            </Link>
            <Link href="/legal/intellectual-property" className="hover:text-black transition-colors">
              Интеллектуальная собственность
            </Link>
            <Link href="/legal/moderation" className="hover:text-black transition-colors">
              Положение о модерации
            </Link>
          </div>
          <p>© 2026 Точка Роста. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}

/* ═════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (до 1024px)
   ═════════════════════════════════════════ */

const wrap = "mx-auto w-full max-w-[1200px] px-[clamp(16px,4.2vw,48px)]";
const noScroll = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function MLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden>
        <path d="M4 12 18 4v8L4 20z" fill={RED} />
        <path d="M12 26 26 18v-8L12 18z" fill="#111" />
        <path d="M4 22 12 18v8l-8 4z" fill={RED} />
      </svg>
      <span className="text-[13px] font-extrabold leading-[1.05] tracking-tight">
        Точка
        <br />
        Роста
      </span>
    </Link>
  );
}

function MHeader({
  onOpenAuth,
  loggedIn,
  isAdmin,
}: {
  onOpenAuth: (mode?: "login" | "register", role?: AuthRole) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5">
      <div className={`${wrap} flex h-[58px] items-center justify-between`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
            className="p-1.5 -ml-1 text-black/70 hover:text-black cursor-pointer"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <MLogo />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const el = document.getElementById("research-m");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label="Поиск"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-black/60"
          >
            <Search size={14} />
          </button>

          {loggedIn ? (
            <button
              onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#111] px-3.5 text-[11px] font-semibold text-white active:scale-95 transition-transform cursor-pointer"
            >
              <span>{isAdmin ? "Админ" : "Кабинет"}</span>
              <ArrowRight size={11} />
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth("login", "all")}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#111] px-3.5 text-[11px] font-semibold text-white active:scale-95 transition-transform cursor-pointer"
            >
              <span>Войти</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Выпадающее меню для мобильных */}
      {menuOpen && (
        <div className="border-t border-black/5 bg-white px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-[#111]">
            <a
              href="#research-m"
              onClick={() => setMenuOpen(false)}
              className="py-1 hover:text-[#E30613]"
            >
              Исследования
            </a>
            <a
              href="#formats-m"
              onClick={() => setMenuOpen(false)}
              className="py-1 hover:text-[#E30613]"
            >
              Форматы взаимодействия
            </a>
            <a
              href="#moderation-m"
              onClick={() => setMenuOpen(false)}
              className="py-1 hover:text-[#E30613]"
            >
              Порядок модерации
            </a>
            <Link
              href="/legal"
              onClick={() => setMenuOpen(false)}
              className="py-1 hover:text-[#E30613]"
            >
              Документы платформы
            </Link>
            <Link
              href="/verify"
              onClick={() => setMenuOpen(false)}
              className="py-1 text-[#E30613] font-bold"
            >
              Реестр подлинности /verify
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function MHero({
  onOpenAuth,
  loggedIn,
  isAdmin,
}: {
  onOpenAuth: (mode?: "login" | "register", role?: AuthRole) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <section className="relative isolate overflow-hidden pt-4 pb-8">
      <Image
        src="/3d/hero-banner.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[75%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#f4f4f6]" />

      <div className={`${wrap} min-h-[460px] flex flex-col justify-center`}>
        <div className="max-w-[420px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[10px] leading-tight text-black/70 shadow-xs border border-black/5">
            <i className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} />
            Платформа финансирования науки
          </span>

          <h1 className="mt-4 text-[28px] font-extrabold leading-[1.08] tracking-tight text-[#111]">
            Привлекайте деньги и гранты{" "}
            <span style={{ color: RED }}>на прикладные разработки</span>
          </h1>

          <p className="mt-3 text-[13px] leading-relaxed text-black/70">
            Единая экосистема для науки и бизнеса. Защита авторских прав, эскроу-контроль сметы и проверенные команды.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {loggedIn ? (
              <button
                onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")}
                className="flex h-10 items-center gap-2.5 rounded-full px-5 text-[12px] font-semibold text-white shadow-sm cursor-pointer"
                style={{ background: RED }}
              >
                <span>В личный кабинет</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth("register", "investor")}
                className="flex h-10 items-center gap-2.5 rounded-full px-5 text-[12px] font-semibold text-white shadow-sm cursor-pointer"
                style={{ background: RED }}
              >
                <span>Регистрация</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              onClick={() => {
                const el = document.getElementById("formats-m");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-[12px] font-semibold text-[#111] shadow-xs cursor-pointer"
            >
              <span>Подробнее</span>
              <Play size={9} fill={RED} stroke={RED} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MFeatures() {
  return (
    <section className={`${wrap} py-8`}>
      <div className="grid grid-cols-3 gap-2 border-b border-black/5 pb-8">
        {features.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className={`flex flex-col items-center px-1 text-center ${
              i ? "border-l border-black/10" : ""
            }`}
          >
            <Icon className="h-6 w-6" color={RED} strokeWidth={1.7} />
            <h3 className="mt-2 text-[11px] font-bold leading-tight">{title}</h3>
            <p className="mt-1 text-[9px] leading-snug text-black/50">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MResearch({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: "login" | "register") => void;
  loggedIn: boolean;
}) {
  const router = useRouter();

  const handleCatalog = () => {
    if (loggedIn) {
      router.push("/dashboard");
    } else {
      onOpenAuth("register");
    }
  };

  return (
    <section id="research-m" className={`${wrap} pb-10 pt-2`}>
      <div className="mb-4">
        <i className="mb-3 block h-[2px] w-6 rounded-full" style={{ background: RED }} />
        <h2 className="text-[22px] font-extrabold leading-[1.08] tracking-tight">
          Актуальные разработки
        </h2>
        <p className="mt-1.5 text-[12px] text-black/60">
          Выбирайте проекты с высоким индексом доверия и понятным планом работ.
        </p>
      </div>

      <div className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 ${noScroll}`}>
        {cards.map((c) => (
          <article
            key={c.title}
            onClick={handleCatalog}
            className="w-[240px] shrink-0 snap-start overflow-hidden rounded-[20px] bg-white shadow-xs border border-black/5"
          >
            <div className="relative h-[120px] bg-gradient-to-b from-[#eceef1] to-white p-2 flex items-center justify-center">
              <CardGraphic type={c.type} />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-medium shadow-xs">
                {c.tag}
              </span>
              <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold shadow-xs">
                <TrendingUp size={9} color={RED} /> {c.score}
              </span>
            </div>
            <div className="p-3.5">
              <h3 className="text-[12px] font-bold leading-snug line-clamp-2">{c.title}</h3>
              <p className="mt-1 text-[10px] text-black/45">{c.org}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-[3px] flex-1 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: RED }}
                  />
                </div>
                <span className="text-[10px] font-bold">{c.pct}%</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MCTA({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: "login" | "register") => void;
  loggedIn: boolean;
}) {
  const router = useRouter();

  return (
    <section className="px-4 pb-8">
      <div className="relative isolate overflow-hidden rounded-[28px] p-6">
        <Image
          src="/3d/cta-banner.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover object-bottom"
        />

        <div>
          <i className="mb-3 block h-[2px] w-7 rounded-full" style={{ background: RED }} />
          <h2 className="text-[26px] font-extrabold leading-[1.06] tracking-tight">
            Открывайте будущее вместе <span style={{ color: RED }}>с наукой</span>
          </h2>
          <p className="mt-2 text-[12px] text-black/65">
            Поддержите исследования или станьте заказчиком инновационных технологий.
          </p>

          <button
            onClick={() => {
              if (loggedIn) router.push("/dashboard");
              else onOpenAuth("register");
            }}
            className="mt-5 inline-flex h-10 items-center gap-2.5 rounded-full px-5 text-[12px] font-semibold text-white shadow-sm cursor-pointer"
            style={{ background: RED }}
          >
            <span>{loggedIn ? "В личный кабинет" : "Стать партнёром"}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <ol className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i ? "bg-white border border-black/10 text-black" : "text-white"
                }`}
                style={i ? undefined : { background: RED }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[12px] font-semibold text-[#111]">{s.t}</h3>
                <p className="text-[10px] text-black/55">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MFooter() {
  return (
    <footer className="border-t border-black/5 bg-white py-6">
      <div className={`${wrap} space-y-4`}>
        <div className="flex items-center justify-between">
          <MLogo />
          <div className="flex gap-2">
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white"
            >
              <Send size={13} />
            </a>
            <a
              href="https://vk.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VK"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[10px] font-bold"
            >
              VK
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-black/55 pt-2 border-t border-black/[0.06]">
          <Link href="/legal" className="hover:underline">
            Документы
          </Link>
          <Link href="/verify" className="hover:underline font-semibold text-[#E30613]">
            Реестр /verify
          </Link>
          <p className="w-full text-[9px] text-black/40 pt-1">
            © 2026 Точка Роста. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═════════════════════════════════════════
   ГЛАВНЫЙ ЭКСПОРТИРУЕМЫЙ КОМПОНЕНТ
   ═════════════════════════════════════════ */

export default function Home() {
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [authRole, setAuthRole] = React.useState<AuthRole>("all");

  const openAuth = (mode: "login" | "register" = "login", role: AuthRole = "all") => {
    setAuthMode(mode);
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  const loggedIn = user !== null;
  const isAdmin = user?.is_admin === true;

  return (
    <>
      {/* Десктоп-версия (от 1024px) */}
      <div className="hidden min-h-screen overflow-x-hidden bg-[#f7f7f8] font-sans text-[#111] antialiased lg:block">
        <Header onOpenAuth={openAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
        <main>
          <Hero onOpenAuth={openAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
          <Features />
          <Research onOpenAuth={openAuth} loggedIn={loggedIn} />
          <FormatsSection onOpenAuth={openAuth} loggedIn={loggedIn} />
          <ModerationSection />
          <SecuritySection />
          <CTA onOpenAuth={openAuth} loggedIn={loggedIn} />
        </main>
        <Footer />
      </div>

      {/* Мобильная и планшетная версия (до 1024px) */}
      <div className="min-h-screen overflow-x-hidden bg-[#f4f4f6] font-sans text-[#111] antialiased lg:hidden">
        <MHeader onOpenAuth={openAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
        <main>
          <MHero onOpenAuth={openAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
          <MFeatures />
          <MResearch onOpenAuth={openAuth} loggedIn={loggedIn} />
          <div id="formats-m">
            <FormatsSection onOpenAuth={openAuth} loggedIn={loggedIn} />
          </div>
          <div id="moderation-m">
            <ModerationSection />
          </div>
          <SecuritySection />
          <MCTA onOpenAuth={openAuth} loggedIn={loggedIn} />
        </main>
        <MFooter />
      </div>

      {/* Модальное окно авторизации с настоящим API */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        initialRole={authRole}
      />
    </>
  );
}
