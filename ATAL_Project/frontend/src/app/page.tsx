"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import AnimatedGradientBackground from "../components/AnimatedGradientBackground";
import { GLSLHills } from "../components/GLSLHills";
import LogoLoop from "../animations/LogoLoop";
import ClickSpark from "../components/ClickSpark";

// Short, custom transition animation for the website content
const blurRevealVariants: Variants = {
  hidden: {
    filter: "blur(12px)",
    opacity: 0,
    y: 10
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};

const textLogos = [
  { text: "ATAL Sansad" },
  { text: "✦", isSeparator: true },
  { text: "ATAL Manas" },
  { text: "✦", isSeparator: true },
];

export default function Home() {
  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full bg-white overflow-y-auto overflow-x-hidden flex flex-col scroll-smooth"
    >
      {/* Hero Section: Take up viewport height and render 3D asset */}
      <div className="relative h-screen min-h-[600px] w-full flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
        {/* Background Layer 1: Animated Gradient Background (Orange & Blue) */}
        <AnimatedGradientBackground containerClassName="z-0" />

        {/* Background Layer 2: Transparent WebGL 3D Landscape Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <GLSLHills speed={0.4} />
        </div>

        {/* Centered Content Wrapper (Logo & Text) with faster Blur Reveal Animation */}
        {/* Shifted slightly downwards using translate-y-8 */}
        <motion.div
          variants={blurRevealVariants}
          initial="hidden"
          animate="visible"
          className="relative z-20 w-full max-w-2xl px-6 flex flex-col items-center text-center transform translate-y-8 pointer-events-none"
        >
          {/* Logo */}
          <Image
            src="/long_form_logo.png"
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
        </motion.div>

        {/* Soft blur fade transition divider to blend the 3D hills background into the next section */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-[#FAFAFA]/70 to-[#FAFAFA] backdrop-blur-[3px] z-30 pointer-events-none" />
      </div>

      {/* Bottom Section: Clean Light Gray Background containing the Text Carousel Ticker */}
      <div className="relative w-full bg-[#FAFAFA] py-20 px-6 flex flex-col items-center justify-center flex-shrink-0">
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <Image
              src="/motif.png"
              alt="ATAL Motif"
              width={160}
              height={160}
              className="w-32 h-auto object-contain opacity-65 select-none pointer-events-none"
            />
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ fontFamily: "var(--font-questrial), sans-serif" }}
              className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-400 hover:text-zinc-900 transition-colors duration-300 select-none cursor-pointer -mt-3"
            >
              Strategic Forums
            </a>
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
            />
          </div>
        </div>
      </div>
    </ClickSpark>
  );
}

