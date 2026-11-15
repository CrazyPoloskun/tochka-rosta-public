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
import { useAuth, AuthModalMode } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";

/* ───────────── КОНСТАНТЫ И ПАЛИТРА ───────────── */

const RED = "#E30613";

const navLinks = [
  { label: "Форматы", href: "#formats" },
  { label: "Регламент", href: "#moderation" },
  { label: "Безопасность", href: "#security" },
  { label: "Документы", href: "/legal" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Проверенные исследования",
    text: "Аудит смет, эскроу-контроль и прозрачные метрики",
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

/* ───────────── КОМПОНЕНТЫ ИНТЕРФЕЙСА ЛЕНДИНГА ───────────── */

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <img
        src="/logo.png"
        alt="Точка Роста"
        className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
      />
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
  onOpenAuth: (mode?: AuthModalMode) => void;
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
            <button
              onClick={() => onOpenAuth("login")}
              className="flex h-10 items-center gap-2 rounded-full bg-[#111] px-6 text-[12px] font-semibold text-white shadow-xs transition-all hover:bg-[#E30613] hover:shadow-[0_8px_20px_-6px_rgba(227,6,19,.5)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Войти</span>
              <ArrowRight size={13} />
            </button>
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
  onOpenAuth: (mode?: AuthModalMode) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#eeeff1] via-[#f3f3f5] to-[#f7f7f8]">
      <section className="relative mx-auto max-w-[1200px] px-6 pb-12 pt-14 lg:min-h-[500px] flex flex-col justify-center">
        <div className="relative z-10 max-w-[580px]">
          {/* Заголовок */}
          <h1 className="mt-2 text-[44px] font-extrabold leading-[1.03] tracking-tight text-[#1e1e22] md:text-[50px]">
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
                onClick={() => onOpenAuth("login")}
                className="flex h-[44px] items-center gap-3 rounded-full px-7 text-[13px] font-semibold text-white shadow-[0_10px_24px_-6px_rgba(227,6,19,.5)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                style={{ background: RED }}
              >
                <span>Войти в систему</span>
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

/* ───────────── ФОРМАТЫ ВЗАИМОДЕЙСТВИЯ (FORMATS) ───────────── */

function FormatsSection({
  onOpenAuth,
  loggedIn,
}: {
  onOpenAuth: (mode?: AuthModalMode) => void;
  loggedIn: boolean;
}) {
  const router = useRouter();

  const handleAction = (role: "investor" | "lab") => {
    if (loggedIn) {
      router.push("/dashboard");
    } else {
      onOpenAuth(role === "lab" ? "register-lab" : "register-investor");
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
                Контрактные НИОКР
              </h3>
              <p className="text-[13px] text-black/60 leading-relaxed">
                Постановка целевых задач бизнесом для исследовательских центров. Оплата только за подтвержденный результат и передача исключительных прав.
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
                Трансфер технологий
              </h3>
              <p className="text-[13px] text-black/60 leading-relaxed">
                Коммерциализация готовых научных патентов и опытных образцов. Подбор индустриальных партнеров и масштабирование производства.
              </p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => handleAction("lab")}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#111] hover:text-[#E30613] transition-colors cursor-pointer"
              >
                <span>Разместить патент</span>
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
      onOpenAuth("login");
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
      <img
        src="/logo.png"
        alt="Точка Роста"
        className="h-7 w-auto object-contain"
      />
    </Link>
  );
}

function MHeader({
  onOpenAuth,
  loggedIn,
  isAdmin,
}: {
  onOpenAuth: (mode?: AuthModalMode) => void;
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
              onClick={() => onOpenAuth("login")}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#111] px-3.5 text-[11px] font-semibold text-white active:scale-95 transition-transform cursor-pointer"
            >
              <span>Войти</span>
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Выпадающее мобильное меню */}
      {menuOpen && (
        <div className="border-b border-black/10 bg-white/95 px-6 py-4 shadow-lg backdrop-blur-xl lg:hidden animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-3">
            {navLinks.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 text-[14px] font-semibold text-black/80 hover:text-[#E30613]"
              >
                {n.label}
              </a>
            ))}
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
  onOpenAuth: (mode?: AuthModalMode) => void;
  loggedIn: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden pb-8 pt-8">
      <Media3D
        src="/3d/molecule"
        poster="/3d/molecule.webp"
        className="absolute -right-16 -top-10 h-72 w-72 opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[#f4f4f6]" />

      <div className={`${wrap} min-h-[380px] flex flex-col justify-center`}>
        <div className="max-w-[420px]">
          <h1 className="mt-2 text-[28px] font-extrabold leading-[1.08] tracking-tight text-[#111]">
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
                onClick={() => onOpenAuth("login")}
                className="flex h-10 items-center gap-2.5 rounded-full px-5 text-[12px] font-semibold text-white shadow-sm cursor-pointer"
                style={{ background: RED }}
              >
                <span>Войти</span>
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
              else onOpenAuth("login");
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
  const { user, openModal } = useAuth();
  const loggedIn = user !== null;
  const isAdmin = user?.is_admin === true;

  const handleOpenAuth = (mode: AuthModalMode = "login") => {
    openModal(mode);
  };

  return (
    <>
      {/* Десктоп-версия (от 1024px) */}
      <div className="hidden min-h-screen overflow-x-hidden bg-[#f7f7f8] font-sans text-[#111] antialiased lg:block">
        <Header onOpenAuth={handleOpenAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
        <main>
          <Hero onOpenAuth={handleOpenAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
          <Features />
          <FormatsSection onOpenAuth={handleOpenAuth} loggedIn={loggedIn} />
          <ModerationSection />
          <SecuritySection />
          <CTA onOpenAuth={handleOpenAuth} loggedIn={loggedIn} />
        </main>
        <Footer />
      </div>

      {/* Мобильная и планшетная версия (до 1024px) */}
      <div className="min-h-screen overflow-x-hidden bg-[#f4f4f6] font-sans text-[#111] antialiased lg:hidden">
        <MHeader onOpenAuth={handleOpenAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
        <main>
          <MHero onOpenAuth={handleOpenAuth} loggedIn={loggedIn} isAdmin={isAdmin} />
          <MFeatures />
          <div id="formats-m">
            <FormatsSection onOpenAuth={handleOpenAuth} loggedIn={loggedIn} />
          </div>
          <div id="moderation-m">
            <ModerationSection />
          </div>
          <SecuritySection />
          <MCTA onOpenAuth={handleOpenAuth} loggedIn={loggedIn} />
        </main>
        <MFooter />
      </div>

      {/* Единое модальное окно авторизации (Вход | Инвестор | НИИ/Лаборатория) */}
      <AuthModal />
    </>
  );
}
