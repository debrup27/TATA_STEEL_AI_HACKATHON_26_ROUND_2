"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ClickSpark from "../../../animations/ClickSpark";
import { PromptInputWithActions } from "../../../components/PromptInputWithActions";

import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/ai-components/steps";
import { TextShimmerLoader } from "@/components/ai-components/loader";
import {
  Source,
  SourceContent,
  SourceTrigger,
} from "@/components/ai-components/source";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ManasChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [deepThinking, setDeepThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSendMessage = useCallback((message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setShowProcessing(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!showProcessing) return;
    const stepCount = 3;
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= stepCount - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    const doneTimer = setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: "Analysis complete. Asset integrity levels are nominal. Predictive wear models estimate 1,200 run hours before replacement. Let me know if you would like me to schedule a diagnostic run." }]);
      setShowProcessing(false);
      setIsLoading(false);
      setCurrentStep(0);
    }, 1500 * stepCount + 500);
    return () => { clearInterval(stepTimer); clearTimeout(doneTimer); };
  }, [showProcessing, deepThinking]);

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative w-full min-h-screen bg-[#FAFAFA] overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth"
    >
      {/* Back to Manas Button */}
      <div className="w-full pt-12 px-6 mb-6 flex justify-start z-20 shrink-0">
        <Link
          href="/manas"
          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors duration-200 select-none cursor-pointer bg-white px-4 py-2.5 rounded-full border border-zinc-200/80 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Manas
        </Link>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="hero"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              <div className="flex flex-col items-center gap-8 -mt-24">
                <Image
                  src="/long_form_logo.png"
                  alt="Project ATAL Logo"
                  width={400}
                  height={267}
                  className="w-full h-auto max-w-[280px] object-contain select-none pointer-events-none drop-shadow-sm"
                  priority
                />
                <div className="text-center">
                  <h1 className="text-2xl md:text-4xl font-extrabold italic text-zinc-900 tracking-tight">Manas</h1>
                  <p className="mt-1 text-sm md:text-base font-semibold text-zinc-500">
                    Asset Intelligence & Lifecycle Diagnostics
                  </p>
                </div>
              </div>
              <motion.div layoutId="chatbox" className="w-full max-w-3xl mx-auto mt-8">
                <PromptInputWithActions
                  deepThinking={deepThinking}
                  onDeepThinkingChange={setDeepThinking}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 flex flex-col px-6 pt-4 pb-4"
            >
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 mt-auto">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.role + i}
                    layout
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i === 0 ? 0.15 : 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-zinc-900 text-white rounded-br-md"
                          : "bg-white border border-zinc-200 text-zinc-700 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {showProcessing && (
                  <motion.div
                    layout
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-[80%]"
                  >
                    <Steps defaultOpen>
                      <StepsTrigger>
                        <TextShimmerLoader
                          text={deepThinking ? "Deep Thinking..." : "Processing your request"}
                          size="md"
                        />
                      </StepsTrigger>
                      <StepsContent>
                        <div className="space-y-1">
                          {deepThinking ? (
                            <>
                              <StepsItem status={currentStep > 0 ? "complete" : currentStep === 0 ? "active" : "pending"}>Reasoning through asset data</StepsItem>
                              <StepsItem status={currentStep > 1 ? "complete" : currentStep === 1 ? "active" : "pending"}>Evaluating equipment history logs</StepsItem>
                              <StepsItem status={currentStep > 2 ? "complete" : currentStep === 2 ? "active" : "pending"}>Compiling wear projections</StepsItem>
                            </>
                          ) : (
                            <>
                              <StepsItem status={currentStep > 0 ? "complete" : currentStep === 0 ? "active" : "pending"}>Parsing telemetry feeds</StepsItem>
                              <StepsItem status={currentStep > 1 ? "complete" : currentStep === 1 ? "active" : "pending"}>
                                <Source href="https://example.com">
                                  <SourceTrigger label="datalake.atal" showFavicon />
                                  <SourceContent
                                    title="ATAL Diagnostic Lake"
                                    description="Primary index for asset sensor feeds."
                                  />
                                </Source>{" "}
                                referenced
                              </StepsItem>
                              <StepsItem status={currentStep > 2 ? "complete" : currentStep === 2 ? "active" : "pending"}>Formulating diagnosis</StepsItem>
                            </>
                          )}
                        </div>
                      </StepsContent>
                    </Steps>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length > 0 && (
          <motion.div
            layoutId="chatbox"
            className="shrink-0 pb-4 pt-2 px-3"
            initial={false}
          >
            <PromptInputWithActions
              deepThinking={deepThinking}
              onDeepThinkingChange={setDeepThinking}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </div>
    </ClickSpark>
  );
}
