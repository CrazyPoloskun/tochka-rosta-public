"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EscrowRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin/finances")
  }, [router])
  return (
    <div className="p-8 text-xs text-[#888888]">
      Перенаправление в раздел «Финансы и Резервный счёт»...
    </div>
  )
}
