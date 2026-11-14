"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LabsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin/users")
  }, [router])
  return (
    <div className="p-8 text-xs text-[#888888]">
      Перенаправление в раздел «Пользователи и НИИ»...
    </div>
  )
}
