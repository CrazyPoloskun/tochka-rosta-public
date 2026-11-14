"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  HiOutlineMagnifyingGlass,
  HiOutlineUser,
  HiOutlineDocumentCheck,
  HiOutlineFolder,
  HiOutlineArrowRight,
} from "react-icons/hi2"

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

interface SearchResult {
  id: number
  title: string
  subtitle: string
  type: "user" | "project" | "idea"
  link: string
}

export function GlobalSearchModal({
  open,
  onOpenChange,
  onSelectUser,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser?: (userId: number) => void
}) {
  const router = useRouter()
  const { authFetch } = useAuth()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/v1/admin/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch (e) {
        console.error("Search error:", e)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, authFetch])

  const handleSelect = (item: SearchResult) => {
    onOpenChange(false)
    if (item.type === "user" && onSelectUser) {
      onSelectUser(item.id)
    } else {
      router.push(item.link)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-[#E2E5EB] bg-white shadow-xl">
        <div className="p-4 border-b border-[#E2E5EB] flex items-center gap-3">
          <HiOutlineMagnifyingGlass className="size-5 text-[#9CA3AF]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Быстрый поиск по пользователям, ИНН, проектам, разработкам..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF] text-[#111111]"
          />
          {loading && <div className="size-4 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin" />}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[#F5F6F8] border border-[#E2E5EB] text-[#9CA3AF] rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim() && results.length === 0 && !loading ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => handleSelect(item)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F6F8] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[#6B7280]">
                    {item.type === "user" && <HiOutlineUser className="size-4" />}
                    {item.type === "project" && <HiOutlineFolder className="size-4" />}
                    {item.type === "idea" && <HiOutlineDocumentCheck className="size-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#111111]">{item.title}</div>
                    <div className="text-[11px] text-[#6B7280]">{item.subtitle}</div>
                  </div>
                </div>
                <HiOutlineArrowRight className="size-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-[#9CA3AF]">
              Введите запрос для поиска по всей экосистеме
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
