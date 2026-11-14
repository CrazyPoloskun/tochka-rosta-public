"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwissGraphicProps {
  className?: string
  variant?: "investors" | "labs" | "security"
}

export function SwissGraphic({ className, variant = "investors" }: SwissGraphicProps) {
  // =========================================================================
  // ВАРИАНТ 3: БЕЗОПАСНОСТЬ — АБСТРАКТНЫЙ ГЕОМЕТРИЧЕСКИЙ ЩИТ В ШВЕЙЦАРСКОМ СТИЛЕ
  // =========================================================================
  if (variant === "security") {
    return (
      <div
        className={cn(
          "w-full h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[460px] flex items-center justify-center relative select-none pointer-events-none",
          className
        )}
      >
        <svg
          viewBox="0 0 520 520"
          className="w-full h-full max-w-[480px] max-h-[480px] overflow-visible pointer-events-none select-none [transform:translateZ(0)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Яркое защитное красное ядро */}
            <radialGradient id="shieldRedCore" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#FF381D" />
              <stop offset="55%" stopColor="#F81B00" />
              <stop offset="100%" stopColor="#D91700" />
            </radialGradient>

            {/* Мягкий коралловый узел */}
            <radialGradient id="shieldCoral" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#FFA494" />
              <stop offset="60%" stopColor="#FF7A66" />
              <stop offset="100%" stopColor="#F8523B" />
            </radialGradient>

            {/* Чистый белый плотный узел */}
            <radialGradient id="shieldWhite" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="85%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F5F6FA" />
            </radialGradient>
          </defs>

          {/* Внешний контур абстрактного щита (чистая векторная геометрия) */}
          <path
            d="M 120 90 L 400 90 C 400 260, 260 410, 260 440 C 260 410, 120 260, 120 90 Z"
            stroke="#111111"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Внутренний пунктирный защитный контур щита */}
          <path
            d="M 155 125 L 365 125 C 365 250, 260 365, 260 385 C 260 365, 155 250, 155 125 Z"
            stroke="#F81B00"
            strokeWidth="2"
            strokeDasharray="6 6"
          />

          {/* Срединная ось и горизонтальные направляющие */}
          <line x1="260" y1="50" x2="260" y2="470" stroke="#111111" strokeWidth="1.5" opacity="0.3" />
          <line x1="120" y1="210" x2="400" y2="210" stroke="#111111" strokeWidth="1.5" opacity="0.3" />

          {/* Концентрическая защитная окружность */}
          <circle cx="260" cy="210" r="100" stroke="#111111" strokeWidth="2.5" />
          <circle cx="260" cy="210" r="135" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />

          {/* Узлы щита (точки в стиле швейцарского референса) */}
          {/* Верхние ключевые узлы */}
          <circle cx="120" cy="90" r="28" fill="url(#shieldCoral)" />
          <circle cx="400" cy="90" r="28" stroke="#111111" strokeWidth="3" />
          <circle cx="260" cy="90" r="24" fill="url(#shieldWhite)" />

          {/* Боковые узлы */}
          <circle cx="120" cy="210" r="32" stroke="#111111" strokeWidth="3" />
          <circle cx="400" cy="210" r="32" fill="url(#shieldCoral)" />

          {/* Нижний замыкающий узел щита */}
          <circle cx="260" cy="440" r="26" fill="url(#shieldWhite)" />

          {/* Центральное защищенное ядро (Эскроу-сердцевина) */}
          <circle cx="260" cy="210" r="54" fill="url(#shieldRedCore)" />
          <circle cx="260" cy="210" r="26" fill="#FFFFFF" />
          <circle cx="260" cy="210" r="12" fill="#111111" />
        </svg>
      </div>
    )
  }

  // =========================================================================
  // ВАРИАНТ 2: НИИ И ЛАБОРАТОРИЯМ (Кластер узлов, интересные связи и фокус)
  // =========================================================================
  if (variant === "labs") {
    return (
      <div
        className={cn(
          "w-full h-full min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] flex items-center justify-center relative select-none pointer-events-none",
          className
        )}
      >
        <svg
          viewBox="0 0 760 480"
          className="w-full h-full object-contain overflow-visible pointer-events-none select-none [transform:translateZ(0)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="labRed" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#FF381D" />
              <stop offset="55%" stopColor="#F81B00" />
              <stop offset="100%" stopColor="#D91700" />
            </radialGradient>

            <radialGradient id="labDark" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#2A2C33" />
              <stop offset="60%" stopColor="#1A1C20" />
              <stop offset="100%" stopColor="#111111" />
            </radialGradient>

            <radialGradient id="labWhite" cx="42%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="85%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F5F6FA" />
            </radialGradient>
          </defs>

          {/* Тонкие направляющие оси для точности и динамики */}
          <line x1="410" y1="40" x2="410" y2="440" stroke="#111111" strokeWidth="1" strokeDasharray="3 5" opacity="0.25" />
          <circle cx="410" cy="245" r="140" stroke="#F81B00" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.45" />

          {/* СПИЦЫ И СОЕДИНИТЕЛЬНЫЕ ЛИНИИ */}
          <line x1="340" y1="230" x2="225" y2="210" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          <line x1="365" y1="185" x2="315" y2="95" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          <line x1="365" y1="310" x2="320" y2="355" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          <line x1="475" y1="220" x2="630" y2="160" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          <line x1="475" y1="260" x2="570" y2="265" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          <line x1="470" y1="290" x2="535" y2="335" stroke="#111111" strokeWidth="3" strokeLinecap="round" />

          {/* ЛЕВЫЙ КЛАСТЕР */}
          <circle cx="165" cy="200" r="50" stroke="#111111" strokeWidth="3" />
          <circle cx="165" cy="200" r="22" stroke="#111111" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="70" cy="235" r="44" fill="url(#labRed)" />

          {/* НИЖНИЙ ЛЕВЫЙ УЗЕЛ */}
          <circle cx="265" cy="390" r="56" fill="url(#labDark)" />

          {/* ВЕРХНИЙ ЛЕВЫЙ БЕЛЫЙ УЗЕЛ */}
          <circle cx="295" cy="65" r="28" fill="url(#labWhite)" />

          {/* ЦЕНТРАЛЬНОЕ ЯДРО */}
          <circle cx="410" cy="245" r="75" stroke="#111111" strokeWidth="3" fill="transparent" />
          <circle cx="445" cy="150" r="46" fill="url(#labWhite)" />

          {/* ВЕРХНИЙ ПРАВЫЙ КЛАСТЕР */}
          <circle cx="550" cy="70" r="22" stroke="#111111" strokeWidth="3" />
          <circle cx="615" cy="100" r="32" fill="url(#labDark)" />
          <circle cx="695" cy="135" r="54" stroke="#111111" strokeWidth="3" />
          <circle cx="695" cy="135" r="26" fill="url(#labRed)" />

          {/* НИЖНИЙ ПРАВЫЙ КЛАСТЕР */}
          <circle cx="585" cy="375" r="50" stroke="#111111" strokeWidth="3" />
          <circle cx="640" cy="275" r="66" fill="url(#labWhite)" />
        </svg>
      </div>
    )
  }

  // =========================================================================
  // ВАРИАНТ 1: ИНВЕСТОРАМ И ДОНОРАМ (Сетка точек + интересные геометрические связи)
  // =========================================================================
  return (
    <div
      className={cn(
        "w-full h-full min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] flex items-center justify-center relative select-none pointer-events-none",
        className
      )}
    >
      <svg
        viewBox="0 0 760 460"
        className="w-full h-full object-contain overflow-visible pointer-events-none select-none [transform:translateZ(0)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="invBrandRed" cx="42%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#FF381D" />
            <stop offset="55%" stopColor="#F81B00" />
            <stop offset="100%" stopColor="#D91700" />
          </radialGradient>

          <radialGradient id="invCoralRed" cx="42%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#FFA494" />
            <stop offset="55%" stopColor="#FF7A66" />
            <stop offset="100%" stopColor="#F8523B" />
          </radialGradient>

          <radialGradient id="invWhite" cx="42%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F5F6FA" />
          </radialGradient>
        </defs>

        {/* Тонкие связующие швейцарские линии для глубины композиции */}
        <line x1="30" y1="75" x2="680" y2="75" stroke="#111111" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
        <line x1="160" y1="220" x2="680" y2="220" stroke="#111111" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
        <line x1="160" y1="75" x2="160" y2="365" stroke="#111111" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
        <line x1="420" y1="75" x2="420" y2="365" stroke="#111111" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />

        {/* Диагональный вектор трансфера капитала */}
        <line x1="160" y1="365" x2="420" y2="75" stroke="#F81B00" strokeWidth="2" strokeDasharray="5 7" opacity="0.6" />

        {/* РЯД 1 (Y = 75) */}
        <circle cx="30" cy="75" r="52" fill="url(#invBrandRed)" />
        <circle cx="160" cy="75" r="52" fill="url(#invWhite)" />
        <circle cx="290" cy="75" r="52" fill="url(#invCoralRed)" />
        {/* Узел с внутренним контуром для интереса */}
        <circle cx="420" cy="75" r="52" fill="url(#invBrandRed)" />
        <circle cx="420" cy="75" r="26" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="550" cy="75" r="52" fill="url(#invCoralRed)" />
        <circle cx="680" cy="75" r="52" stroke="#111111" strokeWidth="3" />
        <circle cx="680" cy="75" r="22" stroke="#111111" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

        {/* РЯД 2 (Y = 220) */}
        <circle cx="30" cy="220" r="52" fill="url(#invWhite)" />
        <circle cx="160" cy="220" r="52" stroke="#111111" strokeWidth="3" />
        <circle cx="290" cy="220" r="52" fill="url(#invCoralRed)" />
        <circle cx="420" cy="220" r="52" stroke="#111111" strokeWidth="3" />
        <circle cx="550" cy="220" r="52" fill="url(#invWhite)" />
        <circle cx="680" cy="220" r="52" stroke="#111111" strokeWidth="3" />

        {/* РЯД 3 (Y = 365) */}
        <circle cx="-35" cy="365" r="52" fill="url(#invWhite)" />
        <circle cx="160" cy="365" r="52" fill="url(#invBrandRed)" />
        <circle cx="290" cy="365" r="52" stroke="#111111" strokeWidth="3" />
        <circle cx="420" cy="365" r="52" fill="url(#invWhite)" />
        <circle cx="550" cy="365" r="52" fill="url(#invWhite)" />
        <circle cx="680" cy="365" r="52" fill="url(#invCoralRed)" />
      </svg>
    </div>
  )
}
