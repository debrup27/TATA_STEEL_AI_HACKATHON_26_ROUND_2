"use client";

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ai-components/prompt-input"
import { SystemMessage } from "@/components/ai-components/system-message"
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/ai-components/file-upload"
import { Button } from "@/components/ui/button"
import { ArrowUp, Brain, Globe, Mic, Paperclip, Plus, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const MAX_FILES = 5

interface UploadedFile {
  id: string
  file: File
  status: "loading" | "loaded"
  pages: string[]
}

interface Toast {
  id: string
  message: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

async function renderPdfPages(file: File): Promise<string[]> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist")
  GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`

  const data = await file.arrayBuffer()
  const pdf = await getDocument({ data }).promise
  const urls: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport }).promise
    urls.push(canvas.toDataURL("image/webp", 0.92))
  }

  return urls
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function PromptInputWithActions({
  deepThinking,
  onDeepThinkingChange,
  onSendMessage,
  isLoading,
  className = "w-full max-w-3xl mx-auto px-3 pb-3 md:px-5 md:pb-5",
}: {
  deepThinking: boolean
  onDeepThinkingChange: (v: boolean) => void
  onSendMessage: (message: string, files: { name: string; type: string; pages: string[] }[]) => void
  isLoading: boolean
  className?: string
}) {
  const [prompt, setPrompt] = useState("")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [expandedFile, setExpandedFile] = useState<UploadedFile | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const addToast = useCallback((message: string) => {
    const id = genId()
    setToasts((prev) => [...prev, { id, message }])
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      delete toastTimers.current[id]
    }, 3150)
  }, [])

  useEffect(() => {
    const currentTimers = toastTimers.current;
    return () => {
      Object.values(currentTimers).forEach(clearTimeout)
    }
  }, [])

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      addToast(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const toAdd = newFiles.slice(0, remaining)
    if (newFiles.length > remaining) {
      addToast(`Only ${remaining} more file${remaining !== 1 ? "s" : ""} allowed`)
    }

    const uploads: UploadedFile[] = toAdd.map((file) => ({
      id: genId(),
      file,
      status: "loading" as const,
      pages: [],
    }))

    setFiles((prev) => [...prev, ...uploads])

    for (const uf of uploads) {
      addToast(`${uf.file.name} uploaded`)
      try {
        const pages = uf.file.type === "application/pdf"
          ? await renderPdfPages(uf.file)
          : [await fileToBase64(uf.file)]

        setFiles((prev) =>
          prev.map((f) => (f.id === uf.id ? { ...f, status: "loaded" as const, pages } : f))
        )
      } catch {
        setFiles((prev) => prev.filter((f) => f.id !== uf.id))
        addToast(`Failed to process ${uf.file.name}`)
      }
    }
  }, [files.length, addToast])

  const handleRemoveFile = useCallback((id: string, fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    addToast(`${fileName} removed`)
    setExpandedFile((prev) => (prev?.id === id ? null : prev))
  }, [addToast])

  const isAnyFileLoading = files.some((f) => f.status === "loading")
  const canSubmit = (prompt.trim() || files.length > 0) && !isAnyFileLoading && !isLoading

  const handleSubmit = () => {
    if (!prompt.trim() && files.length === 0) return
    if (isAnyFileLoading || isLoading) return

    const attached = files.map((f) => ({
      name: f.file.name,
      type: f.file.type,
      pages: f.pages,
    }))
    onSendMessage(prompt.trim(), attached)
    setPrompt("")
    setFiles([])
  }

  const loadedCount = files.filter((f) => f.status === "loaded").length

  return (
    <FileUpload
      onFilesAdded={handleFilesAdded}
      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp"
    >
      <div className={className}>
        {/* System Alerts */}
        <div className="fixed top-4 right-4 z-[1002] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="pointer-events-auto max-w-[360px]"
              >
                <SystemMessage variant="action" fill>
                  {t.message}
                </SystemMessage>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Expanded View Modal */}
        {expandedFile && expandedFile.pages.length > 0 && (
          <div
            className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-6"
            onClick={() => setExpandedFile(null)}
          >
            <div
              className="bg-white rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-7xl max-h-[92vh] w-max h-max"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <p className="text-sm font-semibold text-zinc-700 truncate">{expandedFile.file.name}</p>
                  {expandedFile.file.type === "application/pdf" && (
                    <span className="text-xs text-zinc-400 shrink-0">{expandedFile.pages.length} page{expandedFile.pages.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedFile(null)}
                  className="size-8 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors cursor-pointer shrink-0 text-zinc-500 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto bg-zinc-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400">
                {expandedFile.pages.length === 1 && expandedFile.file.type !== "application/pdf" ? (
                  <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[82vh]">
                    <img
                      src={expandedFile.pages[0]}
                      alt={expandedFile.file.name ?? "Image"}
                      className="max-w-full max-h-full rounded-lg shadow-md object-contain"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-6 px-4">
                    {expandedFile.pages.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`${expandedFile.file.name} - page ${i + 1}`}
                        className="w-full max-w-3xl rounded-lg shadow-md"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <PromptInput
          isLoading={isLoading}
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={handleSubmit}
          className="border-black/10 bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-[inset_0_0_0_1.5px_#ffffff,0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <div className="flex flex-col">
            {files.length > 0 && (
              <div className="mx-3 mt-3 flex items-end gap-3 flex-wrap">
                {files.map((uf) => (
                  <div key={uf.id} className="relative group">
                    <div
                      className="relative w-[140px] h-[130px] rounded-xl overflow-hidden cursor-pointer shadow-xs"
                      onClick={() => uf.status === "loaded" && uf.pages[0] && setExpandedFile(uf)}
                    >
                      {uf.status === "loading" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                          <div className="size-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                          <span className="text-[10px] font-semibold text-zinc-400">Loading</span>
                        </div>
                      ) : (
                        <>
                          <img
                            src={uf.pages[0]}
                            alt={uf.file.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                          <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            {uf.file.name}
                          </p>
                        </>
                      )}
                    </div>
                    <div
                      className="absolute -top-2 -right-2 size-5 rounded-full bg-white border border-zinc-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm hover:bg-red-100 hover:border-red-300"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(uf.id, uf.file.name) }}
                    >
                      <X size={11} className="text-zinc-500 group-hover:text-red-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea
              placeholder="Ask anything"
              className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
            />

            <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Attach files">
                  <FileUploadTrigger asChild>
                    <button
                      className="size-9 rounded-full border border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20 flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                      type="button"
                      disabled={files.some((f) => f.status === "loading")}
                    >
                      {files.some((f) => f.status === "loading") ? (
                        <div className="size-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                      ) : (
                        <Paperclip size={18} />
                      )}
                    </button>
                  </FileUploadTrigger>
                </PromptInputAction>

                <div className="relative">
                  <PromptInputAction tooltip="Add">
                    <button
                      className={`size-9 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        menuOpen
                          ? "border-orange-500 text-orange-600 bg-orange-50/30"
                          : "border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20"
                      }`}
                      onClick={() => setMenuOpen((v) => !v)}
                      type="button"
                    >
                      <span className="block transition-transform duration-200" style={{ transform: menuOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                        <Plus size={18} />
                      </span>
                    </button>
                  </PromptInputAction>

                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: 8 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute bottom-full left-0 mb-2 z-50 bg-white/95 backdrop-blur-md border border-[#1b253c]/10 rounded-2xl shadow-[0_8px_32px_rgba(27,37,60,0.1),inset_0_0_0_1px_rgba(255,255,255,0.8)] p-1.5 flex flex-col gap-0.5 min-w-[210px] origin-bottom-left"
                        >
                          <button
                            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer ${deepThinking ? "text-orange-700 bg-orange-500/10 hover:bg-orange-500/15" : "text-[#1b253c]/85 hover:bg-[#F7F4EC]/65 hover:text-[#1b253c]"}`}
                            onClick={() => {
                              const nextVal = !deepThinking;
                              onDeepThinkingChange(nextVal);
                              addToast(nextVal ? "Deep Thinking enabled" : "Deep Thinking disabled");
                              setMenuOpen(false);
                            }}
                            type="button"
                          >
                            <Brain size={15} className={`shrink-0 ${deepThinking ? "text-orange-600 animate-pulse" : "text-[#1b253c]/50"}`} />
                            Deep Thinking
                            {deepThinking && (
                              <span className="ml-auto size-1.5 rounded-full bg-orange-500 group-hover:hidden animate-pulse" />
                            )}
                            {deepThinking && (
                              <span className="ml-auto hidden group-hover:flex items-center justify-center size-4 rounded-full bg-orange-100 text-orange-600">
                                <X size={10} strokeWidth={2.5} />
                              </span>
                            )}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {files.length > 0 && (
                  <span className="text-[11px] font-semibold text-zinc-400 select-none">
                    {loadedCount}/{MAX_FILES}
                  </span>
                )}

                <PromptInputAction tooltip="Search">
                  <button className="h-9 px-4 rounded-full border border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-sm font-semibold">
                    <Globe size={18} />
                    Search
                  </button>
                </PromptInputAction>

                {deepThinking && (
                  <DeepThinkingPill onDismiss={() => {
                    onDeepThinkingChange(false);
                    addToast("Deep Thinking disabled");
                  }} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <PromptInputAction tooltip="Voice input">
                  <button className="size-9 rounded-full border border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20 flex items-center justify-center transition-all duration-200 cursor-pointer">
                    <Mic size={18} />
                  </button>
                </PromptInputAction>

                <Button
                  size="icon"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="size-9 rounded-full hover:!bg-orange-500 transition-all duration-300"
                >
                  {!isLoading ? (
                    <ArrowUp size={18} />
                  ) : (
                    <span className="size-3 rounded-xs bg-white" />
                  )}
                </Button>
              </div>
            </PromptInputActions>
          </div>
        </PromptInput>

        <FileUploadContent>
          <div className="flex min-h-[200px] w-full items-center justify-center backdrop-blur-sm">
            <div className="bg-white/90 m-4 w-full max-w-md rounded-lg border p-8 shadow-lg">
              <div className="mb-4 flex justify-center">
                <svg
                  className="text-zinc-400 size-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-center text-base font-medium text-zinc-800">
                Drop files to upload
              </h3>
              <p className="text-center text-sm text-zinc-500">
                Release to add files to your message
              </p>
            </div>
          </div>
        </FileUploadContent>
      </div>
    </FileUpload>
  )
}

export { PromptInputWithActions }

function DeepThinkingPill({ onDismiss }: { onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-200/60 bg-orange-50/90 text-[11px] font-bold text-orange-700 cursor-pointer overflow-hidden transition-all duration-200 shadow-3xs"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onDismiss}
      animate={{ paddingRight: hovered ? 10 : 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <span className="relative flex size-1.5 items-center justify-center shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400/80 opacity-75"></span>
        <span className="relative inline-flex rounded-full size-1 bg-orange-500"></span>
      </span>
      <span>Deep Thinking</span>
      <motion.span
        className="flex items-center justify-center overflow-hidden"
        animate={{ width: hovered ? 16 : 0, opacity: hovered ? 1 : 0, marginLeft: hovered ? 4 : 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <X size={11.5} className="text-orange-600 hover:text-orange-855 shrink-0" strokeWidth={2.5} />
      </motion.span>
    </motion.button>
  )
}
