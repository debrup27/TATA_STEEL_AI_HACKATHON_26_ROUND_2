"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import AnimatedGradientBackground from "../components/AnimatedGradientBackground";
import { GLSLHills } from "../components/GLSLHills";

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

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden flex flex-col items-center justify-center">
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
    </div>
  );
}
