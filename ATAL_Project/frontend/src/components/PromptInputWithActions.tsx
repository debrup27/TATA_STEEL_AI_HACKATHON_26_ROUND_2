"use client";

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ai-components/prompt-input"
import { SystemMessage } from "@/components/ai-components/system-message"
import { Button } from "@/components/ui/button"
import { ArrowUp, Brain, ChevronRight, Lightbulb, Mic, Plus, Sparkles, UserRound, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { TOAST_DURATION, DURATION_SLOW } from "@/lib/constants"
import { MANAS_ROLES, manasRoleTag } from "@/lib/manas-roles"

interface Toast {
  id: string
  message: string
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
  hasContext = false,
  contextCount = 0,
  onContextClick,
  onClearContext,
  onConciergeClick,
  selectedRole = null,
  onRoleChange,
  contextEnabled = true,
  alertsEnabled = true,
  onDisableAlerts,
  triggerToast,
}: {
  deepThinking: boolean
  onDeepThinkingChange: (v: boolean) => void
  onSendMessage: (message: string) => void
  isLoading: boolean
  className?: string
  hasContext?: boolean
  contextCount?: number
  onContextClick?: () => void
  onClearContext?: () => void
  onConciergeClick?: () => void
  selectedRole?: string | null
  onRoleChange?: (role: string | null) => void
  contextEnabled?: boolean
  alertsEnabled?: boolean
  onDisableAlerts?: () => void
  triggerToast?: string | null
}) {
  const [prompt, setPrompt] = useState("")
  const [toasts, setToasts] = useState<Toast[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)

  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const addToast = useCallback((message: string) => {
    if (!alertsEnabled) return
    const id = genId()
    setToasts((prev) => [...prev, { id, message }])
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      delete toastTimers.current[id]
    }, TOAST_DURATION)
  }, [alertsEnabled])

  useEffect(() => {
    const currentTimers = toastTimers.current;
    return () => {
      Object.values(currentTimers).forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (triggerToast && alertsEnabled) {
      const timer = setTimeout(() => {
        addToast(triggerToast)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [triggerToast, addToast, alertsEnabled])

  const canSubmit = prompt.trim().length > 0 && !isLoading

  const handleSubmit = () => {
    if (!prompt.trim() || isLoading) return
    onSendMessage(prompt.trim())
    setPrompt("")
  }

  return (
    <div className={className}>
      <div className="fixed top-4 right-4 z-[1002] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: DURATION_SLOW, ease: "easeOut" }}
              className="pointer-events-auto max-w-[360px]"
            >
              <SystemMessage variant="action" fill>
                <div className="flex flex-col gap-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      clearTimeout(toastTimers.current[t.id]);
                      delete toastTimers.current[t.id];
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                    className="absolute top-0 right-0 p-0.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer pointer-events-auto"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="pr-5">{t.message}</span>
                  <button
                    type="button"
                    onClick={() => onDisableAlerts?.()}
                    className="text-[10px] font-bold underline hover:text-[#f97316]/80 text-left cursor-pointer pointer-events-auto"
                  >
                    Disable Alerts
                  </button>
                </div>
              </SystemMessage>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PromptInput
        isLoading={isLoading}
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={handleSubmit}
        className="border-black/10 bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-[inset_0_0_0_1.5px_#ffffff,0_1px_2px_rgba(0,0,0,0.05)]"
      >
        <div className="flex flex-col">
          <PromptInputTextarea
            placeholder="Ask anything"
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />

          <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <PromptInputAction tooltip="Add">
                  <button
                    className={`size-9 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      menuOpen
                        ? "border-orange-500 text-orange-600 bg-orange-50/30"
                        : "border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20"
                    }`}
                    onClick={() => {
                      setMenuOpen((v) => {
                        if (v) setRolesOpen(false);
                        return !v;
                      });
                    }}
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
                      <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setRolesOpen(false); }} />
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
                        </button>

                        {contextEnabled && (
                          <button
                            className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer text-[#1b253c]/85 hover:bg-[#F7F4EC]/65 hover:text-[#1b253c]"
                            onClick={() => {
                              onConciergeClick?.();
                              setMenuOpen(false);
                              setRolesOpen(false);
                            }}
                            type="button"
                          >
                            <Sparkles size={15} className="shrink-0 text-[#1b253c]/50" />
                            Concierge Context
                          </button>
                        )}

                        <div className="relative">
                          <button
                            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold cursor-pointer w-full ${
                              selectedRole
                                ? "text-violet-700 bg-violet-500/10 hover:bg-violet-500/15"
                                : "text-[#1b253c]/85 hover:bg-[#F7F4EC]/65 hover:text-[#1b253c]"
                            }`}
                            onClick={() => setRolesOpen((v) => !v)}
                            type="button"
                          >
                            <UserRound size={15} className={`shrink-0 ${selectedRole ? "text-violet-600" : "text-[#1b253c]/50"}`} />
                            <span className="flex-1 text-left">Roles</span>
                            <ChevronRight
                              size={14}
                              className={`shrink-0 text-zinc-400 transition-transform ${rolesOpen ? "rotate-90" : ""}`}
                            />
                          </button>

                          <AnimatePresence>
                            {rolesOpen && (
                              <motion.div
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-full top-0 ml-1.5 z-50 bg-white/95 backdrop-blur-md border border-[#1b253c]/10 rounded-2xl shadow-[0_8px_32px_rgba(27,37,60,0.1)] p-1.5 flex flex-col gap-0.5 min-w-[200px]"
                              >
                                {MANAS_ROLES.map((role) => (
                                  <button
                                    key={role.id}
                                    type="button"
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                      selectedRole === role.id
                                        ? "bg-violet-500/10 text-violet-700"
                                        : "text-[#1b253c]/85 hover:bg-[#F7F4EC]/65"
                                    }`}
                                    onClick={() => {
                                      onRoleChange?.(role.id);
                                      addToast(`Role set — ${manasRoleTag(role.id)}`);
                                      setMenuOpen(false);
                                      setRolesOpen(false);
                                    }}
                                  >
                                    <span className="font-mono text-[10px] text-zinc-400 shrink-0">role:</span>
                                    {role.label}
                                  </button>
                                ))}
                                {selectedRole && (
                                  <button
                                    type="button"
                                    className="mt-0.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide text-zinc-500 hover:bg-zinc-100 cursor-pointer text-left"
                                    onClick={() => {
                                      onRoleChange?.(null);
                                      addToast("Role cleared");
                                      setMenuOpen(false);
                                      setRolesOpen(false);
                                    }}
                                  >
                                    Clear role
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <PromptInputAction tooltip="Advice (coming soon)">
                <button
                  className="h-9 px-4 rounded-full border border-[#1b253c]/15 text-[#1b253c]/55 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50/30 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer text-sm font-semibold"
                  type="button"
                  onClick={() => addToast("Advice mode — coming soon")}
                >
                  <Lightbulb size={18} />
                  Advice
                </button>
              </PromptInputAction>

              {selectedRole && manasRoleTag(selectedRole) && (
                <RolePill
                  label={manasRoleTag(selectedRole)!}
                  onDismiss={() => {
                    onRoleChange?.(null);
                    addToast("Role cleared");
                  }}
                />
              )}

              {deepThinking && (
                <DeepThinkingPill onDismiss={() => {
                  onDeepThinkingChange(false);
                  addToast("Deep Thinking disabled");
                }} />
              )}

              {hasContext && (
                <ContextPill
                  count={contextCount}
                  onClick={onContextClick || (() => {})}
                  onDismiss={onClearContext || (() => {})}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <PromptInputAction tooltip="Voice input">
                <button className="size-9 rounded-full border border-[#1b253c]/20 text-[#1b253c] hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/20 flex items-center justify-center transition-all duration-200 cursor-pointer" type="button">
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
    </div>
  )
}

export { PromptInputWithActions }

function RolePill({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-200/70 bg-violet-50/90 text-[11px] font-bold text-violet-700 cursor-pointer overflow-hidden transition-all duration-200 shadow-3xs font-mono"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onDismiss}
      animate={{ paddingRight: hovered ? 10 : 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      type="button"
    >
      <UserRound size={12} className="shrink-0 text-violet-500" />
      <span>{label}</span>
      <motion.span
        className="flex items-center justify-center overflow-hidden"
        animate={{ width: hovered ? 16 : 0, opacity: hovered ? 1 : 0, marginLeft: hovered ? 4 : 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <X size={11.5} className="text-violet-600 shrink-0" strokeWidth={2.5} />
      </motion.span>
    </motion.button>
  )
}

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

function ContextPill({
  count,
  onClick,
  onDismiss,
}: {
  count: number
  onClick: () => void
  onDismiss: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-250/70 bg-emerald-50/90 text-[11px] font-bold text-emerald-700 cursor-pointer overflow-hidden transition-all duration-200 shadow-3xs"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      animate={{ paddingRight: hovered ? 10 : 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <span className="relative flex size-1.5 items-center justify-center shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75"></span>
        <span className="relative inline-flex rounded-full size-1 bg-emerald-500"></span>
      </span>
      <span>Context ({count})</span>
      <motion.button
        type="button"
        className="flex items-center justify-center overflow-hidden h-4 w-4 rounded-full hover:bg-emerald-100/80 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        animate={{ width: hovered ? 16 : 0, opacity: hovered ? 1 : 0, marginLeft: hovered ? 4 : 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <X size={11.5} className="text-emerald-600 hover:text-emerald-800 shrink-0" strokeWidth={2.5} />
      </motion.button>
    </motion.div>
  )
}
