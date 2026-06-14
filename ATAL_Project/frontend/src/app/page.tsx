"use client";

import React, { useRef, useState } from "react";
import { motion, Variants, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import AnimatedGradientBackground from "../animations/AnimatedGradientBackground";
import { GLSLHills } from "../animations/GLSLHills";
import LogoLoop, { LogoItem } from "../animations/LogoLoop";
import ClickSpark from "../animations/ClickSpark";
import AtalDisplayModal from "../components/AtalDisplayModal";
import AtalDeveloperSection from "../components/AtalDeveloperSection";
import AtalBottomBanner from "../components/AtalBottomBanner";
import AtalFooter from "../components/AtalFooter";
import { triggerPageTransition } from "../animations/PageTransition";

const blurReveal: Variants = {
  hidden: { filter: "blur(6px)", opacity: 0, y: 8 },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const textLogos: LogoItem[] = [
  { text: "ATAL Sansad", href: "/sansad" },
  { text: "✦", isSeparator: true },
  { text: "ATAL Manas", href: "/manas" },
  { text: "✦", isSeparator: true },
];

// Custom renderItem that intercepts internal hrefs with page transition
function renderLogoWithTransition(item: LogoItem, key: string) {
  const isSeparator = item.isSeparator || item.text === "✦";
  const textEl = (
    <span
      style={{ fontFamily: "var(--font-questrial), sans-serif" }}
      className={
        isSeparator
          ? "text-base md:text-lg font-bold text-zinc-300 select-none"
          : "text-lg md:text-2xl font-bold tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors duration-300 select-none whitespace-nowrap"
      }
    >
      {item.text}
    </span>
  );

  if (!isSeparator && item.href) {
    return (
      <button
        key={key}
        onClick={() => triggerPageTransition(item.href!)}
        className="inline-flex items-center text-current no-underline rounded cursor-pointer bg-transparent border-none p-0"
        aria-label={item.text}
      >
        {textEl}
      </button>
    );
  }
  return textEl;
}

export default function Home() {
  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: modalScrollRef,
    offset: ["start end", "end end"]
  });

  // Left hand translation & rotation:
  // Starts off-screen left (-1100px), slides in to point at the modal (250px) as we scroll down to the bottom of the page.
  const leftX = useTransform(scrollYProgress, [0.0, 0.85, 1.0], [-1100, 250, 250]);
  const leftRotate = useTransform(scrollYProgress, [0.0, 0.85, 1.0], [-15, 0, 0]);

  // Right hand translation & rotation:
  // Starts off-screen right (1100px), slides in to point at the modal (-250px) as we scroll down to the bottom of the page.
  const rightX = useTransform(scrollYProgress, [0.0, 0.85, 1.0], [1100, -250, -250]);
  const rightRotate = useTransform(scrollYProgress, [0.0, 0.85, 1.0], [15, 0, 0]);

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full bg-white flex flex-col scroll-smooth overflow-x-hidden"
    >
      {/* Hero Section: Take up viewport height and render 3D asset */}
      <div className="relative h-screen min-h-[600px] w-full flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
        {/* Background Layer 1: Animated Gradient Background (Orange & Blue) */}
        <AnimatedGradientBackground containerClassName="z-0" />

        {/* Background Layer 2: Transparent WebGL 3D Landscape Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <GLSLHills speed={0.4} />
        </div>

        {/* Centered Content Wrapper */}
        <motion.div
          variants={blurReveal}
          initial="hidden"
          animate="visible"
          className="relative z-20 w-full max-w-2xl px-6 flex flex-col items-center text-center transform translate-y-8 pointer-events-none"
        >
          {/* Logo */}
          <Image
            src="/long_form_logo.webp"
            alt="Project ATAL Logo"
            width={600}
            height={400}
            className="w-full h-auto max-w-[500px] object-contain select-none pointer-events-none drop-shadow-sm"
            priority
          />

          {/* Full Title (positioned very close under the logo) */}
          <p
            style={{ fontFamily: "var(--font-questrial), sans-serif" }}
            className="mt-1 text-[10px] min-[400px]:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold tracking-wide text-zinc-800 whitespace-nowrap"
          >
            Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management
          </p>

          <HoverButton />
        </motion.div>

        {/* Soft blur fade transition divider to blend the 3D hills background into the next section */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-[#FAFAFA]/70 to-[#FAFAFA] backdrop-blur-[3px] z-30 pointer-events-none" />
      </div>

      <div
        ref={bottomSectionRef}
        className="relative w-full bg-[#FAFAFA] py-20 px-6 flex flex-col items-center justify-center flex-shrink-0 overflow-hidden"
      >
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-4 relative z-20">
          <div className="flex flex-col items-center">
            <Image
              src="/motif.webp"
              alt="ATAL Motif"
              width={160}
              height={160}
              className="w-32 h-auto object-contain opacity-65 select-none pointer-events-none"
            />
            <button
              onClick={() => triggerPageTransition("/sansad")}
              style={{ fontFamily: "var(--font-questrial), sans-serif" }}
              className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400 hover:text-blue-600 transition-colors duration-300 select-none cursor-pointer -mt-3 bg-transparent border-none p-0"
            >
              Our Concierge
            </button>
            {/* Divider: Line, gem (✦), and another line in the same row as requested */}
            <div className="flex items-center gap-3 w-40 justify-center mt-3">
              <div className="h-px bg-zinc-300/80 flex-grow" />
              <span className="text-[10px] text-zinc-400 select-none">✦</span>
              <div className="h-px bg-zinc-300/80 flex-grow" />
            </div>
          </div>
          <div className="w-full relative py-2">
            <LogoLoop
              logos={textLogos}
              speed={40}
              direction="left"
              logoHeight={32}
              gap={60}
              fadeOut={true}
              fadeOutColor="#FAFAFA" // Match bottom section background
              scaleOnHover={true}
              pauseOnHover={true}
              ariaLabel="ATAL Programs Ticker"
              renderItem={renderLogoWithTransition}
            />
          </div>

          {/* Custom Display Modal Component with Relative Container and Parallax Hands */}
          <div ref={modalScrollRef} className="w-full mt-10 relative">
            {/* Left Parallax Hand */}
            <motion.div
              style={{ x: leftX, rotate: leftRotate, y: "-50%" }}
              className="absolute right-full mr-6 top-1/2 w-[700px] lg:w-[1000px] h-auto pointer-events-none z-10 origin-right hidden md:block"
            >
              <Image
                src="/left_hand.webp"
                alt="Left Hand pointing"
                width={1536}
                height={1024}
                priority
                className="w-full h-auto object-contain"
              />
            </motion.div>

            {/* Right Parallax Hand */}
            <motion.div
              style={{ x: rightX, rotate: rightRotate, y: "-50%" }}
              className="absolute left-full ml-6 top-1/2 w-[700px] lg:w-[1000px] h-auto pointer-events-none z-10 origin-left hidden md:block"
            >
              <Image
                src="/right_hand.webp"
                alt="Right Hand pointing"
                width={1536}
                height={1024}
                priority
                className="w-full h-auto object-contain"
              />
            </motion.div>

            <AtalDisplayModal />
          </div>

          {/* New Sections rendered below the modal and hands container */}
          <AtalDeveloperSection />
          <AtalBottomBanner />
        </div>
      </div>
      <AtalFooter />
    </ClickSpark>
  );
}

import { useUser } from "../hooks";

function HoverButton() {
  const { user } = useUser();
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredManas, setIsHoveredManas] = useState(false);
  const [isHoveredSansad, setIsHoveredSansad] = useState(false);

  if (user) {
    return (
      <div className="mt-8 flex gap-4 pointer-events-auto">
        <motion.button
          onClick={() => triggerPageTransition("/sansad")}
          className="flex items-center border border-zinc-300/60 backdrop-blur-md font-bold text-sm md:text-base pl-6 py-3.5 rounded-full shadow-md cursor-pointer overflow-hidden"
          animate={{
            backgroundColor: isHoveredSansad ? "#120F17" : "rgba(255,255,255,0.2)",
            color: isHoveredSansad ? "#ffffff" : "#1e293b",
            scale: isHoveredSansad ? 1.05 : 1,
            paddingRight: isHoveredSansad ? 28 : 24,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onHoverStart={() => setIsHoveredSansad(true)}
          onHoverEnd={() => setIsHoveredSansad(false)}
          whileTap={{ scale: 0.95 }}
        >
          <span>SANSAD</span>
          <motion.span
            className="inline-block overflow-hidden text-lg md:text-xl font-bold align-middle"
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{
              width: isHoveredSansad ? 20 : 0,
              opacity: isHoveredSansad ? 1 : 0,
              marginLeft: isHoveredSansad ? 8 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            →
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => triggerPageTransition("/manas")}
          className="flex items-center border border-zinc-300/60 backdrop-blur-md font-bold text-sm md:text-base pl-6 py-3.5 rounded-full shadow-md cursor-pointer overflow-hidden"
          animate={{
            backgroundColor: isHoveredManas ? "#120F17" : "rgba(255,255,255,0.2)",
            color: isHoveredManas ? "#ffffff" : "#1e293b",
            scale: isHoveredManas ? 1.05 : 1,
            paddingRight: isHoveredManas ? 28 : 24,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onHoverStart={() => setIsHoveredManas(true)}
          onHoverEnd={() => setIsHoveredManas(false)}
          whileTap={{ scale: 0.95 }}
        >
          <span>MANAS</span>
          <motion.span
            className="inline-block overflow-hidden text-lg md:text-xl font-bold align-middle"
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{
              width: isHoveredManas ? 20 : 0,
              opacity: isHoveredManas ? 1 : 0,
              marginLeft: isHoveredManas ? 8 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            →
          </motion.span>
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      onClick={() => triggerPageTransition("/login")}
      className="mt-8 flex items-center border border-zinc-300/60 backdrop-blur-md font-bold text-sm md:text-base pl-6 py-3.5 rounded-full shadow-md cursor-pointer pointer-events-auto overflow-hidden"
      animate={{
        backgroundColor: isHovered ? "#120F17" : "rgba(255,255,255,0.2)",
        color: isHovered ? "#ffffff" : "#1e293b",
        scale: isHovered ? 1.05 : 1,
        paddingRight: isHovered ? 28 : 24,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
    >
      <span>Get Started</span>
      <motion.span
        className="inline-block overflow-hidden text-lg md:text-xl font-bold align-middle"
        initial={{ width: 0, opacity: 0, marginLeft: 0 }}
        animate={{
          width: isHovered ? 20 : 0,
          opacity: isHovered ? 1 : 0,
          marginLeft: isHovered ? 8 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        →
      </motion.span>
    </motion.button>
  );
}
