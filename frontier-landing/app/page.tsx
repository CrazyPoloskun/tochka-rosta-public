// app/page.tsx
"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Image from "next/image";

/* ───────────── ОБЩИЕ ДАННЫЕ ───────────── */

const RED = "#E30613";

const nav = ["Исследования", "Лаборатории", "О платформе", "Для бизнеса", "Для науки"];

const features = [
  { icon: ShieldCheck, title: "Проверенные исследования", text: "Индекс доверия лабораторий и прозрачные метрики" },
  { icon: Layers, title: "Поэтапный контроль", text: "Эскроу-механика и понятный трекер" },
  { icon: Zap, title: "Доступ к экспертизе", text: "ИИ-аналитика отчётов и экспертная оценка" },
];

const cards = [
  { tag: "Новые материалы", score: "98.7", title: "Разработка умных полимеров", org: "ТулГУ", pct: 72, img: "/3d/card-polymer.webp" },
  { tag: "Биотех", score: "96.1", title: "Генная терапия редких заболеваний", org: "МГУ", pct: 41, img: "/3d/card-biotech.webp" },
  { tag: "ИИ и данные", score: "95.8", title: "Нейросетевые модели для медицины", org: "СПбГУ", pct: 23, img: "/3d/card-brain.webp" },
];

const steps = [
  { t: "Выберите проект", d: "Изучите исследования и оцените их потенциал" },
  { t: "Поддержите", d: "Внесите вклад или выделите ресурсы" },
  { t: "Следите за прогрессом", d: "Получайте отчёты и результаты" },
];

/* ═════════════════════════════════════════
   МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ
   ═════════════════════════════════════════ */

type AuthRole = "all" | "investor" | "lab";

const authRoles: { id: AuthRole; label: string; icon: typeof Sparkles }[] = [
  { id: "all", label: "Вход", icon: Sparkles },
  { id: "investor", label: "Инвестор", icon: Building2 },
  { id: "lab", label: "НИИ / Лаборатория", icon: FlaskConical },
];

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [role, setRole] = useState<AuthRole>("all");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAdminRedirect, setIsAdminRedirect] = useState(false);

  useEffect(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isAdmin =
      email.trim().toLowerCase() === "admin@tochkarosta.ru" &&
      password === "admin12345";

    if (isAdmin) {
      setIsAdminRedirect(true);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      try {
        localStorage.setItem("tr_session", isAdmin ? "admin" : "user");
      } catch {}
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (isAdmin) {
          router.push("/admin");
        }
      }, 750);
    }, 600);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      {/* Затемнение и стеклянный фон с деликатным красным свечением */}
      <div className="fixed inset-0 bg-black/45 backdrop-blur-md transition-opacity animate-in fade-in duration-300" />
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="h-[460px] w-[460px] rounded-full bg-red-600/[0.12] blur-[110px]" />
      </div>

      {/* Окно авторизации */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[440px] my-auto transition-all animate-in fade-in zoom-in-95 duration-250"
      >
        {/* Верхний логотип */}
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <svg width="34" height="34" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <path d="M4 12 18 4v8L4 20z" fill={RED} />
            <path d="M12 26 26 18v-8L12 18z" fill="#111" />
            <path d="M4 22 12 18v8l-8 4z" fill={RED} />
          </svg>
          <span className="text-[17px] font-extrabold leading-[1.05] tracking-tight text-black">
            Точка<br />Роста
          </span>
        </div>

        {/* Переключатель ролей (Вход / Инвестор / НИИ) */}
        <div className="relative mb-3.5 flex items-center rounded-full bg-white/95 p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-black/[0.06] backdrop-blur-md">
          {authRoles.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 py-2 px-2 text-center text-[12px] sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer rounded-full ${
                  active
                    ? "bg-[#111] text-white shadow-sm"
                    : "text-black/65 hover:text-black hover:bg-black/[0.03]"
                }`}
              >
                <Icon size={12} className={active ? "text-white" : "text-black/40"} />
                <span className="truncate">{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Главная карточка с формой */}
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-white/95 p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.22),0_0_40px_rgba(227,6,19,0.06)] border border-white backdrop-blur-2xl">
          
          {/* Деликатный дизайнерский градиентный блик в углу карточки */}
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

          {/* Форма */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            
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
                    className="w-full bg-transparent py-3.5 pl-3 pr-4 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
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
                  className="w-full bg-transparent py-3.5 pl-3 pr-4 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
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
                    onClick={() => alert("Ссылка для восстановления пароля отправлена на указанную почту.")}
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
                  className="w-full bg-transparent py-3.5 pl-3 pr-11 text-[13px] font-medium text-[#111] placeholder:text-black/35 focus:outline-none"
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
                    <CheckCircle2 size={16} />{" "}
                    {isAdminRedirect ? "Вход администратора! Переход..." : "Успешно!"}
                  </span>
                ) : isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {isAdminRedirect ? "Авторизация администратора..." : "Вход в систему..."}
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

          {/* Разделитель и переключение Вход / Регистрация */}
          <div className="mt-6 pt-5 border-t border-black/[0.08] text-center">
            {mode === "login" ? (
              <p className="text-[12px] text-black/60">
                Ещё нет аккаунта?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
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
                  onClick={() => setMode("login")}
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



function Logo() {
  return (
    <a href="#" className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
        <path d="M4 12 18 4v8L4 20z" fill={RED} />
        <path d="M12 26 26 18v-8L12 18z" fill="#111" />
        <path d="M4 22 12 18v8l-8 4z" fill={RED} />
      </svg>
      <span className="text-[15px] font-bold leading-[1.05] text-black">
        Точка<br />Роста
      </span>
    </a>
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

function Header({ onOpenAuth, loggedIn }: { onOpenAuth: () => void; loggedIn: boolean }) {
  return (
    <header className="border-b border-black/5">
      <div className="mx-auto flex h-[66px] max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-[72px]">
          <Logo />
          <nav className="hidden gap-8 text-[12px] text-black/80 lg:flex">
            {nav.map((n) => (
              <a key={n} href="#" className="hover:text-black">{n}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button aria-label="Поиск" className="flex h-9 w-[58px] items-center justify-center rounded-full border border-black/10 bg-white/70">
            <Search size={14} />
          </button>
          <button
            onClick={onOpenAuth}
            className="flex h-10 items-center gap-2 rounded-full bg-[#111] px-6 text-[12px] font-semibold text-white transition-all hover:bg-black hover:shadow hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            {loggedIn ? "Кабинет" : "Войти"} <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="bg-gradient-to-b from-[#eeeff1] via-[#f3f3f5] to-[#f7f7f8]">
      <section className="relative mx-auto max-w-[1200px] px-6 pb-10 pt-12">
        <div className="relative z-10 max-w-[560px]">
          <span className="inline-flex items-center gap-3 rounded-full border border-black/5 bg-white/70 px-5 py-3 text-[11px] leading-tight text-black/70">
            <i className="h-2 w-2 rounded-full" style={{ background: RED }} />
            Платформа финансирования<br />научных исследований
          </span>
          <h1 className="mt-14 text-[44px] font-extrabold leading-[1.02] tracking-tight text-[#2b2b2f] md:text-[50px]">
            Привлекайте деньги бизнеса и гранты <span style={{ color: RED }}>на прикладные разработки</span>
          </h1>
          <p className="mt-7 max-w-[400px] text-[15px] leading-[1.45] text-black/60">
            Единая платформа, где наука встречается с бизнесом. Прозрачное финансирование, надёжные команды и реальные результаты.
          </p>
          <div className="mt-9 flex gap-4">
            <a
              href="#"
              className="flex h-[42px] items-center gap-4 rounded-full px-6 text-[12px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(227,6,19,.6)]"
              style={{ background: RED }}
            >
              Зарегистрироваться <ArrowRight size={14} />
            </a>
            <a
              href="#"
              className="flex h-[42px] items-center gap-4 rounded-full border border-black/10 bg-white/60 px-6 text-[12px] font-semibold text-[#111]"
            >
              Узнать больше <Play size={9} fill={RED} stroke={RED} className="ml-1" />
            </a>
          </div>
        </div>

        {/* 3D молекула (видео) */}
        <Media3D
          src="/3d/molecule"
          poster="/3d/molecule.webp"
          className="absolute right-[-60px] top-0 z-0 hidden h-[480px] w-[640px] lg:block"
        />

        {/* Индекс доверия */}
        <div className="absolute right-6 top-8 z-20 hidden items-center gap-3 rounded-[22px] bg-white/80 px-5 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,.15)] backdrop-blur lg:flex">
          <TrendingUp size={22} color={RED} />
          <div>
            <div className="text-[9px] font-semibold text-black/70">Индекс доверия</div>
            <div className="text-[24px] font-bold leading-none">
              98.7 <span className="text-[8px]" style={{ color: RED }}>↗</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-[1200px] px-6">
      <div className="grid gap-8 border-b border-black/5 pb-10 md:grid-cols-3 md:gap-0">
        {features.map(({ icon: Icon, title, text }, i) => (
          <div
            key={title}
            className={`flex items-start gap-4 md:px-8 ${i ? "md:border-l md:border-black/10" : "md:pl-0"}`}
          >
            <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_-6px_rgba(0,0,0,.2)]">
              <Icon size={22} color={RED} strokeWidth={1.6} />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold leading-tight text-[#111]">{title}</h3>
              <p className="mt-2 max-w-[190px] text-[12px] leading-snug text-black/50">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Research() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-start gap-10 px-6 py-12 lg:grid-cols-[250px_1fr]">
      <div>
        <i className="mb-5 block h-[2px] w-[30px]" style={{ background: RED }} />
        <h2 className="text-[28px] font-extrabold leading-[1.05] tracking-tight">
          Актуальные<br />исследования
        </h2>
        <p className="mt-5 max-w-[190px] text-[13px] leading-snug text-black/55">
          Выберите проект, который вдохновляет, и инвестируйте в его развитие.
        </p>
        <a
          href="#"
          className="mt-9 inline-flex h-[42px] items-center gap-4 rounded-full bg-[#111] px-6 text-[12px] font-semibold text-white"
        >
          Перейти в каталог <ArrowRight size={13} />
        </a>
        <div className="mt-12 flex items-center gap-4 text-[12px]">
          <span><b>01</b> <span className="text-black/40">/ 03</span></span>
          {[ChevronLeft, ChevronRight].map((I, i) => (
            <button
              key={i}
              aria-label={i ? "Далее" : "Назад"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white"
            >
              <I size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="grid gap-5 sm:grid-cols-3">
          {cards.map((c) => (
            <article
              key={c.title}
              className="overflow-hidden rounded-[20px] border border-black/5 bg-white/80 shadow-[0_10px_30px_-18px_rgba(0,0,0,.25)]"
            >
              <div className="relative h-[158px] bg-gradient-to-b from-[#f1f2f4] to-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[9px] font-medium shadow-sm">
                  {c.tag}
                </span>
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[9px] font-bold shadow-sm">
                  <TrendingUp size={10} color={RED} /> {c.score}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-[13px] font-semibold leading-snug">{c.title}</h3>
                <p className="mt-2 text-[10px] text-black/40">{c.org}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-[3px] flex-1 rounded-full bg-black/10">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: RED }} />
                  </div>
                  <span className="text-[10px] font-semibold">{c.pct}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <button
          aria-label="Следующие"
          className="absolute -right-5 top-1/2 hidden h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white xl:flex"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}

function CTA() {
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
          <i className="mb-5 block h-[2px] w-[30px]" style={{ background: RED }} />
          <h2 className="text-[40px] font-extrabold leading-[1.02] tracking-tight text-[#111]">
            Открывайте будущее вместе <span style={{ color: RED }}>с наукой</span>
          </h2>
          <p className="mt-6 text-[14px] leading-snug text-black/60">
            Поддержите исследования<br />или станьте партнёром проектов
          </p>
          <a
            href="#"
            className="mt-9 inline-flex h-[42px] items-center gap-4 rounded-full px-6 text-[12px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(227,6,19,.6)]"
            style={{ background: RED }}
          >
            Стать партнёром <ArrowRight size={14} />
          </a>
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
                className={`z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  i ? "border border-black/10 bg-white text-black" : "text-white"
                }`}
                style={i ? undefined : { background: RED }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[14px] font-semibold">{s.t}</h3>
                <p className="mt-1 max-w-[180px] text-[11px] leading-snug text-black/50">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6 py-6">
        <div className="flex items-center gap-[72px]">
          <Logo />
          <nav className="hidden gap-8 text-[11px] text-black/80 lg:flex">
            {nav.map((n) => (
              <a key={n} href="#" className="hover:text-black">{n}</a>
            ))}
          </nav>
        </div>
        <div className="flex gap-3">
          <a href="#" aria-label="Telegram" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white">
            <Send size={14} />
          </a>
          <a href="#" aria-label="VK" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[11px] font-bold">
            VK
          </a>
        </div>
        <p className="w-full text-right text-[9px] text-black/50">
          © 2026 Точка Роста. Все права защищены.
        </p>
      </div>
    </footer>
  );
}

/* ═════════════════════════════════════════
   МОБИЛЬНАЯ ВЕРСИЯ (показывается до lg)
   ═════════════════════════════════════════ */

const wrap = "mx-auto w-full max-w-[1200px] px-[clamp(16px,4.2vw,48px)]";
const noScroll = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function MLogo() {
  return (
    <a href="#" className="flex items-center gap-1.5">
      <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden>
        <path d="M4 12 18 4v8L4 20z" fill={RED} />
        <path d="M12 26 26 18v-8L12 18z" fill="#111" />
        <path d="M4 22 12 18v8l-8 4z" fill={RED} />
      </svg>
      <span className="text-[clamp(12px,1.9vw,15px)] font-bold leading-[1.05]">Точка<br />Роста</span>
    </a>
  );
}

function MHeader({ onOpenAuth, loggedIn }: { onOpenAuth: () => void; loggedIn: boolean }) {
  return (
    <header className="relative z-30">
      <div className={`${wrap} flex h-[clamp(52px,8vw,68px)] items-center justify-between`}>
        <div className="flex items-center gap-[clamp(16px,6vw,72px)]">
          <MLogo />
          <nav className="hidden gap-[clamp(10px,2.6vw,32px)] text-[clamp(9px,1.4vw,12px)] sm:flex">
            {nav.map((n) => <a key={n} href="#" className="whitespace-nowrap">{n}</a>)}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <button aria-label="Поиск" className="flex h-8 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm sm:h-9 sm:w-[54px]">
            <Search size={14} />
          </button>
          <button
            onClick={onOpenAuth}
            className="flex h-8 items-center gap-1.5 rounded-full bg-[#111] px-4 text-[11px] font-semibold text-white sm:h-10 sm:px-6 sm:text-[12px] active:scale-95 transition-transform cursor-pointer"
          >
            {loggedIn ? "Кабинет" : "Войти"} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}

function MHero() {
  return (
    <section className="relative isolate -mt-[clamp(52px,8vw,68px)] overflow-hidden pt-[clamp(52px,8vw,68px)]">
      <Image
        src="/3d/hero-banner.jpg" alt="" fill priority sizes="100vw"
        className="-z-10 object-cover object-[75%_center]"
      />
      {/* мягкая подложка слева для читаемости текста */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/60 via-white/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#f4f4f6]" />

      {/* min-h увеличен, чтобы колба оставалась видна под текстом */}
      <div className={`${wrap} min-h-[clamp(460px,88vw,760px)] pb-[8vw] pt-[clamp(8px,1.6vw,20px)]`}>
        <div className="max-w-[clamp(200px,52vw,540px)]">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-white/70 px-[clamp(12px,2.2vw,22px)] py-[clamp(7px,1.3vw,12px)] text-[clamp(9px,1.4vw,11px)] leading-tight text-black/70 shadow-sm">
            <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: RED }} />
            Платформа финансирования<br />научных исследований
          </span>

          <h1 className="mt-[clamp(14px,3vw,32px)] text-[clamp(26px,4.9vw,54px)] font-extrabold leading-[1.04] tracking-tight text-[#111]">
            Привлекайте деньги и гранты <span style={{ color: RED }}>на прикладные разработки</span>
          </h1>

          <p className="mt-[clamp(10px,2vw,20px)] max-w-[420px] text-[clamp(12px,1.9vw,16px)] leading-[1.5] text-black/65">
            Единая платформа, где наука встречается с бизнесом. Прозрачное финансирование, надёжные команды и реальные результаты.
          </p>

          <div className="mt-[clamp(14px,2.6vw,28px)] flex flex-wrap gap-3">
            <a href="#" className="flex h-[clamp(38px,5vw,46px)] items-center gap-3 rounded-full px-[clamp(16px,3vw,28px)] text-[clamp(11px,1.6vw,13px)] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(227,6,19,.7)]" style={{ background: RED }}>
              Зарегистрироваться <ArrowRight size={14} />
            </a>
            <a href="#" className="flex h-[clamp(38px,5vw,46px)] items-center gap-3 rounded-full bg-white/80 px-[clamp(16px,3vw,28px)] text-[clamp(11px,1.6vw,13px)] font-semibold shadow-sm">
              Узнать больше <Play size={9} fill={RED} stroke={RED} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function MFeatures() {
  return (
    <section className={`${wrap} pb-[clamp(24px,5vw,48px)] pt-[clamp(8px,3vw,32px)]`}>
      <div className="grid grid-cols-3 border-b border-black/5 pb-[clamp(24px,5vw,48px)]">
        {features.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className={`flex flex-col items-center px-[clamp(6px,2.4vw,32px)] text-center ${i ? "border-l border-black/10" : ""}`}>
            <Icon className="h-[clamp(26px,5vw,44px)] w-[clamp(26px,5vw,44px)]" color={RED} strokeWidth={1.5} />
            <h3 className="mt-[clamp(10px,2vw,20px)] text-[clamp(11px,2.1vw,18px)] font-semibold leading-tight">{title}</h3>
            <p className="mt-2 text-[clamp(9px,1.5vw,13px)] leading-snug text-black/45">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MResearch() {
  return (
    <section className={`${wrap} grid items-start gap-6 pb-[clamp(32px,7vw,80px)] sm:grid-cols-[27%_1fr] sm:gap-[2.5vw]`}>
      <div>
        <i className="mb-4 block h-[2px] w-7" style={{ background: RED }} />
        <h2 className="text-[clamp(22px,3.6vw,32px)] font-extrabold leading-[1.05] tracking-tight">
          Актуальные<br />исследования
        </h2>
        <p className="mt-3 max-w-[240px] text-[clamp(11px,1.6vw,14px)] leading-snug text-black/55">
          Выбирайте проекты с высоким индексом доверия и понятным планом работ.
        </p>
        <a href="#" className="mt-5 inline-flex h-10 items-center gap-3 rounded-full bg-[#111] px-5 text-[12px] font-semibold text-white sm:mt-8">
          Перейти в каталог <ArrowRight size={12} />
        </a>
        <div className="mt-6 hidden items-center gap-3 text-[12px] sm:flex">
          <span><b>01</b> <span className="text-black/40">/ 03</span></span>
          {[ChevronLeft, ChevronRight].map((I, i) => (
            <button key={i} aria-label={i ? "Далее" : "Назад"} className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white">
              <I size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="relative -mr-[clamp(16px,4.2vw,48px)] sm:mr-0">
        <button aria-label="Назад" className="absolute -left-3 top-[30%] z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-white shadow-md sm:flex">
          <ChevronLeft size={14} />
        </button>
        <div className={`flex snap-x snap-mandatory gap-[clamp(10px,2.2vw,20px)] overflow-x-auto pb-4 pr-[clamp(16px,4.2vw,48px)] ${noScroll}`}>
          {cards.map((c) => (
            <article key={c.title} className="w-[clamp(168px,29vw,260px)] shrink-0 snap-start overflow-hidden rounded-[20px] bg-white/85 shadow-[0_10px_30px_-14px_rgba(0,0,0,.25)]">
              <div className="relative h-[clamp(96px,17vw,160px)] bg-gradient-to-b from-[#eceef1] to-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[clamp(8px,1.2vw,10px)] font-medium shadow-sm">{c.tag}</span>
                <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[clamp(8px,1.2vw,10px)] font-bold shadow-sm">
                  <TrendingUp size={10} color={RED} /> {c.score}
                </span>
              </div>
              <div className="p-[clamp(10px,1.8vw,16px)]">
                <h3 className="text-[clamp(11px,1.6vw,14px)] font-semibold leading-snug">{c.title}</h3>
                <p className="mt-1.5 text-[clamp(9px,1.3vw,11px)] text-black/40">{c.org}</p>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-[3px] flex-1 rounded-full bg-black/10">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: RED }} />
                  </div>
                  <span className="text-[clamp(9px,1.3vw,11px)] font-semibold">{c.pct}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <button aria-label="Далее" className="absolute -right-1 top-[30%] z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-white shadow-md sm:flex">
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}

function MCTA() {
  return (
    <section className="px-[clamp(8px,2.6vw,32px)] pb-[clamp(8px,2.6vw,32px)]">
      <div className="relative isolate mx-auto max-w-[1280px] overflow-hidden rounded-[clamp(22px,3.6vw,40px)]">
        <Image src="/3d/cta-banner.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover object-bottom" />

        <div className="grid gap-8 px-[clamp(20px,6.4vw,72px)] pb-[clamp(90px,18vw,200px)] pt-[clamp(32px,7vw,72px)] sm:grid-cols-[1.2fr_1fr] sm:items-start">
          <div>
            <i className="mb-[clamp(14px,3vw,30px)] block h-[2px] w-8" style={{ background: RED }} />
            <h2 className="text-[clamp(28px,5.2vw,56px)] font-extrabold leading-[1.04] tracking-tight">
              Открывайте будущее вместе <span style={{ color: RED }}>с наукой</span>
            </h2>
            <p className="mt-[clamp(14px,2.4vw,26px)] text-[clamp(12px,1.9vw,16px)] leading-snug text-black/65">
              Поддержите исследования<br />или станьте партнёром проектов
            </p>
            <a href="#" className="mt-[clamp(20px,3.4vw,36px)] inline-flex h-[clamp(38px,5vw,46px)] items-center gap-3 rounded-full px-[clamp(16px,3vw,28px)] text-[clamp(11px,1.6vw,13px)] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(227,6,19,.7)]" style={{ background: RED }}>
              Стать партнёром <ArrowRight size={14} />
            </a>
          </div>

          <ol className="relative space-y-[clamp(18px,3.4vw,34px)] sm:mt-[clamp(0px,1vw,12px)] sm:justify-self-end">
            <span className="absolute left-[13px] top-4 h-[calc(100%-32px)] w-px bg-black/15" aria-hidden />
            {steps.map((s, i) => (
              <li key={s.t} className="relative flex gap-4">
                <span
                  className={`z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${i ? "border border-black/10 bg-white" : "text-white"}`}
                  style={i ? undefined : { background: RED }}
                >{i + 1}</span>
                <div>
                  <h3 className="text-[clamp(12px,1.8vw,15px)] font-semibold">{s.t}</h3>
                  <p className="mt-1 max-w-[190px] text-[clamp(10px,1.4vw,12px)] leading-snug text-black/50">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MFooter() {
  return (
    <footer className="border-t border-black/5">
      <div className={`${wrap} flex flex-wrap items-center justify-between gap-5 py-6`}>
        <MLogo />
        <div className="flex gap-3">
          <a href="#" aria-label="Telegram" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white"><Send size={14} /></a>
          <a href="#" aria-label="VK" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[11px] font-bold">VK</a>
        </div>
        <p className="w-full text-[10px] text-black/50 sm:text-right">© 2026 Точка Роста. Все права защищены.</p>
      </div>
    </footer>
  );
}

export default function Page() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [session, setSession] = useState<string | null>(null);

  const readSession = () => {
    try {
      setSession(localStorage.getItem("tr_session"));
    } catch {
      setSession(null);
    }
  };

  useEffect(() => {
    readSession();
  }, []);

  // Уже вошёл как администратор — кнопка ведёт прямо в кабинет
  const handleAuthClick = () => {
    if (session === "admin") {
      router.push("/admin");
      return;
    }
    setIsAuthOpen(true);
  };

  const loggedIn = session !== null;

  return (
    <>
      {/* Десктоп: от 1024px */}
      <div className="hidden min-h-screen overflow-x-hidden bg-[#f7f7f8] font-sans text-[#111] antialiased lg:block">
        <Header onOpenAuth={handleAuthClick} loggedIn={loggedIn} />
        <main>
          <Hero />
          <Features />
          <Research />
          <CTA />
        </main>
        <Footer />
      </div>

      {/* Мобильная и планшет: до 1024px */}
      <div className="min-h-screen overflow-x-hidden bg-[#f4f4f6] font-sans text-[#111] antialiased lg:hidden">
        <MHeader onOpenAuth={handleAuthClick} loggedIn={loggedIn} />
        <main>
          <MHero />
          <MFeatures />
          <MResearch />
          <MCTA />
        </main>
        <MFooter />
      </div>

      {/* Модальное окно авторизации */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          readSession();
        }}
      />
    </>
  );
}
