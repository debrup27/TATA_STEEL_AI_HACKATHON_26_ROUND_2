"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import ClickSpark from "../../animations/ClickSpark";
import { Send, RefreshCw } from "lucide-react";
import AtalFooter from "../../components/AtalFooter";
import {
  Steps,
  StepsContent,
  StepsItem,
  StepsTrigger,
  StepsBar
} from "@/components/ai-components/steps";
import { TextShimmerLoader } from "@/components/ai-components/loader";
import {
  Source,
  SourceContent,
  SourceTrigger
} from "@/components/ai-components/source";
import { getWelcomeMessage, generateDemoReply } from "@/services/chat";
import { useMockChatSimulation, useUser } from "@/hooks";
import { SPRING_SOFT, SPRING_MEDIUM, CHAT_SIM_OVERRIDE_STEP_INTERVAL, CHAT_SIM_OVERRIDE_EXTRA_DONE_DELAY } from "@/lib/constants";

const DemoMessage = React.memo(function DemoMessage({ 
  msg, 
  compact 
}: { 
  msg: { role: string; content: string }; 
  compact?: boolean 
}) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] font-semibold ${
          compact 
            ? "rounded-xl px-2.5 py-1.5 leading-normal shadow-3xs text-[10px]" 
            : "rounded-2xl px-4 py-2.5 leading-normal shadow-xs text-[11px] sm:text-xs"
        } ${
          msg.role === "user"
            ? `bg-zinc-900 text-white ${compact ? "rounded-tr-xs" : "rounded-tr-sm"}`
            : `bg-white border border-zinc-200/80 text-zinc-700 ${compact ? "rounded-tl-xs" : "rounded-tl-sm"}`
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
});

export default function ManasLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  
  // Interactive Chat Demo states
  const [demoMessages, setDemoMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    getWelcomeMessage(),
  ]);
  const [inputText, setInputText] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const chatSim = useMockChatSimulation({
    stepInterval: CHAT_SIM_OVERRIDE_STEP_INTERVAL,
    extraDoneDelay: CHAT_SIM_OVERRIDE_EXTRA_DONE_DELAY,
    onDone: () => {
      setDemoMessages((prev) => {
        const lastUserMsg = prev[prev.length - 1]?.content || "";
        const reply = generateDemoReply(lastUserMsg);
        return [...prev, { role: "assistant", content: reply }];
      });
    },
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSendDemoMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || chatSim.isLoading) return;
    const userMsg = inputText.trim();
    setDemoMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInputText("");
    chatSim.start();
  };

  const resetDemo = () => {
    setDemoMessages([getWelcomeMessage()]);
    setInputText("");
    chatSim.reset();
  };

  // Scroll Progress Hooks (Desktop)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [isExpanded, setIsExpanded] = useState(() => scrollYProgress.get() > 0.7);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setIsExpanded(latest > 0.7);
  });

  // Transform values for scrolling column layout
  const leftX = useTransform(scrollYProgress, [0, 1], ["0%", "-100%"]);
  const leftOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const bottomRightX = useTransform(scrollYProgress, [0, 1], ["0%", "-250%"]);
  const bottomRightOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Morphing Box scale & translate
  const boxWidth = useTransform(scrollYProgress, [0, 1], ["30%", "100%"]);
  const boxHeight = useTransform(scrollYProgress, [0, 1], ["45vh", "100vh"]);

  // Typographic spacing transitions
  const textMaxWidth = useTransform(scrollYProgress, [0, 1], ["300px", "980px"]);
  const textSize = useTransform(scrollYProgress, [0, 1], ["1.8vw", "3.6vw"]);

  // Parallax icons scale & Y offset
  const iconsScale = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0.3;
    if (v >= 1) return 1;
    return (v - 0.7) / 0.3;
  });
  const iconsY = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0;
    if (v >= 1) return -15;
    return -15 * ((v - 0.7) / 0.3);
  });
  const iconsOpacity = useTransform(scrollYProgress, (v) => {
    if (v <= 0.7) return 0;
    if (v >= 1) return 1;
    return (v - 0.7) / 0.3;
  });

  const buttonOpacity = useTransform(scrollYProgress, [0.9, 1], [0, 1]);

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={8}
      sparkRadius={18}
      sparkCount={6}
      duration={350}
      className="relative min-h-screen w-full bg-[#FAF9F5] flex flex-col justify-start"
    >
      {isMobile ? (
        // MOBILE VIEW (STATIC DESIGN)
        <div className="flex flex-col gap-6 w-full max-w-md md:hidden px-6 pt-24 pb-12 mx-auto">
          <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-sm">
            <h1 className="text-3xl font-black text-zinc-950 tracking-tighter leading-none uppercase">
              Conversational<br />AI Agent<br />In your control.
            </h1>
            <p className="text-[9px] text-zinc-400 mt-3 font-bold uppercase tracking-[0.25em]">
              MANAS Chatbot Assistant
            </p>
          </div>

          {/* Mobile view interactive simulator */}
          <div 
            className="relative p-6 border border-black/10 rounded-2xl flex items-center justify-center overflow-hidden w-full"
            style={{
              backgroundImage: "url('/pastel.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            {/* Interactive Safari Window (mobile width) */}
            <div className="w-full h-[240px] rounded-xl bg-white/75 backdrop-blur-md border border-black/10 flex flex-col overflow-hidden shadow-xl">
              {/* Browser Header Bar */}
              <div className="border-b border-black/10 px-3 py-2 flex items-center justify-between bg-white/90 backdrop-blur-xs select-none">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="size-1.5 rounded-full bg-[#ff5f56]" />
                  <span className="size-1.5 rounded-full bg-[#ffbd2e]" />
                  <span className="size-1.5 rounded-full bg-[#27c93f]" />
                </div>
                <span 
                  className="text-sm font-bold text-zinc-800 tracking-wider uppercase select-none"
                  style={{ fontFamily: "var(--font-pixeloid)" }}
                >
                  ATAL
                </span>
                <RefreshCw 
                  size={8} 
                  className="text-zinc-400 cursor-pointer hover:text-orange-500 transition-colors" 
                  onClick={resetDemo}
                />
              </div>

              {/* Chat Screen Messages area */}
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 bg-transparent text-[10px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {demoMessages.map((msg, i) => (
                  <DemoMessage key={i} msg={msg} compact />
                ))}
                {chatSim.showProcessing && (
                  <div className="max-w-[90%] self-start text-[9px]">
                    <Steps defaultOpen>
                      <StepsTrigger>
                        <TextShimmerLoader
                          text="Processing your request"
                          size="sm"
                        />
                      </StepsTrigger>
                      <StepsContent bar={<StepsBar />}>
                        <div className="space-y-1 mt-0.5 font-medium">
                          <StepsItem status={chatSim.currentStep > 0 ? "complete" : chatSim.currentStep === 0 ? "active" : "pending"}>
                            Parsing telemetry
                          </StepsItem>
                          <StepsItem status={chatSim.currentStep > 1 ? "complete" : chatSim.currentStep === 1 ? "active" : "pending"}>
                            Source referenced
                          </StepsItem>
                          <StepsItem status={chatSim.currentStep > 2 ? "complete" : chatSim.currentStep === 2 ? "active" : "pending"}>
                            Formulating diagnosis
                          </StepsItem>
                        </div>
                      </StepsContent>
                    </Steps>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <form 
                onSubmit={handleSendDemoMessage}
                className="border-t border-black/10 p-2 bg-white/90 backdrop-blur-xs flex gap-1.5 items-center shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask Manas..."
                  disabled={chatSim.isLoading}
                  className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || chatSim.isLoading}
                  className="p-1 bg-zinc-950 text-white rounded-lg hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send size={8} />
                </button>
              </form>
            </div>
          </div>

          <Link 
            href={user ? "/manas/chat" : "/login"}
            className="bg-zinc-950 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between border border-zinc-950 hover:bg-zinc-800 transition-colors"
          >
            <div>
              <h3 className="text-xs font-bold">Try manas now</h3>
              <p className="text-[9px] text-zinc-400 mt-0.5">Enter conversational lifecycle monitoring.</p>
            </div>
            <span className="font-extrabold text-sm">→</span>
          </Link>
        </div>
      ) : (
        // DESKTOP VIEW (SCROLL-DRIVEN DESIGN)
        <div ref={containerRef} className="w-screen h-[200vh] relative bg-[#FAF9F5]">
          
          <div className="sticky top-0 left-0 right-0 h-screen w-screen overflow-hidden bg-[#FAF9F5] relative">
            

            {/* Left Gutter - scrolling "CHAT WITH MANAS" */}
            <div className="absolute left-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start">
              <div className="animate-marquee-up flex flex-col items-center w-full">
                {Array(4).fill(["CHAT", "WITH", "MANAS"]).flat().map((text, idx) => (
                  <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200 py-12 pointer-events-auto">
                    <span className="manas-text-filled text-3xl lg:text-4xl xl:text-5xl tracking-wider select-none">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Gutter - scrolling "MANAS" */}
            <div className="absolute right-0 top-0 bottom-0 w-[8vw] overflow-hidden z-20 pointer-events-none flex flex-col justify-start">
              <div className="animate-marquee-down flex flex-col items-center w-full">
                {Array(6).fill("MANAS").concat(Array(6).fill("MANAS")).map((text, idx) => (
                  <div key={idx} className="w-full h-[33.33vh] flex items-center justify-center border-b border-zinc-200 py-12 pointer-events-auto">
                    <span className="manas-text-filled text-4xl lg:text-5xl xl:text-6xl tracking-wider">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Dividers */}
            <div className="absolute left-[8vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none" />
            <div className="absolute right-[8vw] top-0 bottom-0 w-[1px] bg-zinc-200 z-30 pointer-events-none" />

            {/* Centered Main Wrapper */}
            <div className="absolute left-[8vw] w-[84vw] h-full bg-[#FAF9F5] relative overflow-hidden">
              
              {/* Left Column contents */}
              <motion.div 
                style={{ x: leftX, opacity: leftOpacity }}
                className="absolute left-0 w-[70%] h-full flex flex-col overflow-hidden z-10 pointer-events-none bg-[#FAF9F5]"
              >
                {/* Heading detail */}
                <div className="h-[45vh] border-b border-zinc-200 flex flex-col justify-end select-none bg-[#FAF9F5] overflow-hidden pt-28 flex-shrink-0">
                  <div className="px-16 pb-12">
                    <h1 className="text-5xl lg:text-[4vw] font-black text-zinc-950 tracking-tighter leading-[0.88] uppercase">
                      Conversational<br />Intelligence<br />At your command.
                    </h1>
                    <p className="text-[10px] text-zinc-400 mt-4 font-black uppercase tracking-[0.25em] leading-none">
                      MANAS Chatbot Assistant Interface
                    </p>
                  </div>
                </div>

                {/* Bottom-Left — Chat Client Simulator Container (with pastel meadow background) */}
                <div 
                  className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 pointer-events-auto select-none overflow-hidden relative"
                  style={{
                    backgroundImage: "url('/pastel.webp')",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                >
                  
                  {/* Container for Centered Safari Browser mockup */}
                  <div className="w-full h-full flex items-center justify-center py-2">
                    
                    {/* Safari Browser Window Mockup */}
                    <div className="w-[85%] h-[88%] rounded-2xl bg-white/75 backdrop-blur-md border border-black/10 flex flex-col overflow-hidden shadow-2xl">
                      
                      {/* Browser Header Bar */}
                      <div className="border-b border-black/10 px-4 py-3 flex items-center justify-between bg-white/90 backdrop-blur-xs select-none">
                        {/* Traffic light control buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="size-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="size-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                        <span 
                          className="text-xl font-bold text-zinc-800 tracking-wider uppercase select-none"
                          style={{ fontFamily: "var(--font-pixeloid)" }}
                        >
                          ATAL
                        </span>
                        {/* Right tools */}
                        <div className="w-[30px] flex justify-end shrink-0">
                          <RefreshCw 
                            size={10} 
                            className="text-zinc-400 cursor-pointer hover:text-orange-500 transition-colors" 
                            onClick={() => {
                              resetDemo();
                            }}
                          />
                        </div>
                      </div>

                      {/* Chat Messages Panel */}
                      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-transparent text-[11px] sm:text-xs [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {demoMessages.map((msg, i) => (
                          <DemoMessage key={i} msg={msg} />
                        ))}
                        {chatSim.showProcessing && (
                          <div className="max-w-[85%] self-start text-[11px]">
                            <Steps defaultOpen>
                              <StepsTrigger>
                                <TextShimmerLoader
                                  text="Processing your request"
                                  size="sm"
                                />
                              </StepsTrigger>
                              <StepsContent bar={<StepsBar />}>
                                <div className="space-y-1 mt-1 font-medium">
                                  <StepsItem status={chatSim.currentStep > 0 ? "complete" : chatSim.currentStep === 0 ? "active" : "pending"}>
                                    Parsing telemetry feeds
                                  </StepsItem>
                                  <StepsItem status={chatSim.currentStep > 1 ? "complete" : chatSim.currentStep === 1 ? "active" : "pending"}>
                                    <Source>
                                      <SourceTrigger label="datalake.atal" showFavicon />
                                      <SourceContent
                                        title="ATAL Diagnostic Lake"
                                        description="Primary index for asset sensor feeds."
                                      />
                                    </Source>{" "}
                                    referenced
                                  </StepsItem>
                                  <StepsItem status={chatSim.currentStep > 2 ? "complete" : chatSim.currentStep === 2 ? "active" : "pending"}>
                                    Formulating diagnosis
                                  </StepsItem>
                                </div>
                              </StepsContent>
                            </Steps>
                          </div>
                        )}
                      </div>

                      {/* Browser Input Bar */}
                      <form 
                        onSubmit={handleSendDemoMessage}
                        className="border-t border-black/5 p-3.5 bg-white/90 backdrop-blur-xs flex gap-2 items-center shrink-0"
                      >
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Ask Manas..."
                          disabled={chatSim.isLoading}
                          className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!inputText.trim() || chatSim.isLoading}
                          className="p-2.5 bg-zinc-950 text-white rounded-xl hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-zinc-950 shrink-0"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              </motion.div>

              {/* Bottom-Right scroll prompt */}
              <motion.div 
                style={{ x: bottomRightX, opacity: bottomRightOpacity }}
                className="absolute left-[70%] w-[30%] top-[45vh] bottom-0 flex flex-col items-center justify-center gap-12 p-8 bg-[#FAF9F5] z-10 pointer-events-none border-l border-zinc-200 overflow-hidden"
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="flex flex-col gap-1 animate-bounce">
                    <span className="text-zinc-400 font-extrabold text-4xl leading-none">↓</span>
                    <span className="text-zinc-300 font-extrabold text-4xl leading-none -mt-3">↓</span>
                    <span className="text-zinc-200 font-extrabold text-4xl leading-none -mt-3">↓</span>
                  </div>
                </div>

                <div className="flex flex-col items-center" style={{ fontFamily: "var(--font-pixeloid)" }}>
                  <span className="text-zinc-800 text-7xl leading-none tracking-tighter">Scroll</span>
                  <span className="text-zinc-800 text-7xl leading-none tracking-tighter mt-1">Down</span>
                </div>
              </motion.div>

              {/* MORPHING DESCRIPTION BOX */}
              <motion.div 
                style={{ right: 0, width: boxWidth, height: boxHeight }}
                className="absolute top-0 z-40 overflow-hidden"
              >
                <div className="absolute inset-0 border-l border-r border-b border-zinc-200 bg-[#FAF6EE]" />
                
                <div className="absolute inset-0 p-8 select-none flex flex-col items-center justify-center">
                  <motion.div 
                    style={{ maxWidth: textMaxWidth }}
                    className="relative flex flex-col items-center justify-center w-full"
                  >
                    {/* Parallax icons aligned to chat focus */}
                    <motion.div 
                      style={{ 
                        opacity: iconsOpacity, 
                        y: iconsY, 
                        scale: iconsScale 
                      }}
                      className="absolute flex gap-16 items-center pointer-events-none"
                    >
                      <Image src="/message.webp" alt="Message Icon" width={1536} height={1024} className="w-28 h-28 object-contain" />
                      <Image src="/leaf.webp" alt="Leaf Icon" width={1536} height={1024} className="w-28 h-28 object-contain" />
                      <Image src="/brain.webp" alt="Brain Icon" width={1536} height={1024} className="w-28 h-28 object-contain" />
                    </motion.div>

                    <motion.div 
                      layout
                      transition={{ type: "spring", ...SPRING_SOFT }}
                      style={{ fontSize: textSize }}
                      className={`font-bold text-zinc-950 leading-tight tracking-tight flex mt-20 md:mt-24 lg:mt-28 xl:mt-32 ${
                        isExpanded 
                          ? "flex-row gap-x-[0.35em] justify-center text-center" 
                          : "flex-col items-start text-left"
                      }`}
                    >
                      <motion.span layout transition={{ type: "spring", ...SPRING_SOFT }} className="whitespace-nowrap">Conversational agent</motion.span>
                      <motion.span layout transition={{ type: "spring", ...SPRING_SOFT }} className="whitespace-nowrap">is now yours.</motion.span>
                    </motion.div>
                  </motion.div>

                  {/* Launch button leads directly to active chat view */}
                  <motion.div style={{ opacity: buttonOpacity }} className="flex flex-col items-center gap-4 mt-12">
                    <Link href={user ? "/manas/chat" : "/login"} className="block">
                      <motion.div
                        className="flex items-center text-white text-2xl tracking-tight rounded-xl shadow-lg cursor-pointer overflow-hidden"
                        style={{ fontFamily: "var(--font-pixeloid)", backgroundColor: "#000000" }}
                        variants={{
                          rest: { backgroundColor: "#000000", scale: 1, padding: "16px 40px" },
                          hover: { backgroundColor: "#f97316", scale: 1.03, padding: "16px 48px" }
                        }}
                        initial="rest"
                        whileHover="hover"
                        transition={{ type: "spring", ...SPRING_MEDIUM }}
                      >
                        <motion.span>Try manas now</motion.span>
                        <motion.div
                          className="flex items-center overflow-hidden"
                          variants={{
                            rest: { width: 0, opacity: 0 },
                            hover: { width: "auto", opacity: 1 }
                          }}
                          transition={{ type: "spring", ...SPRING_MEDIUM }}
                        >
                          <span className="ml-2">→</span>
                        </motion.div>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      )}
      <AtalFooter />
    </ClickSpark>
  );
}
