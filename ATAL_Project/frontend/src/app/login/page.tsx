"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import AnimatedGradientBackground from "../../animations/AnimatedGradientBackground";
import { GLSLHills } from "../../animations/GLSLHills";
import ClickSpark from "../../animations/ClickSpark";
import { triggerPageTransition } from "../../animations/PageTransition";

// Memoized Background component to prevent re-renders when form states change
const BackgroundLayers = React.memo(() => {
  return (
    <>
      <AnimatedGradientBackground containerClassName="absolute inset-0 z-0" />
      <div className="absolute inset-0 z-10 pointer-events-none">
        <GLSLHills speed={0.3} />
      </div>
    </>
  );
});
BackgroundLayers.displayName = "BackgroundLayers";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleToggle = (signUp: boolean) => {
    setIsSignUp(signUp);
    setName("");
    setUsernameOrEmail("");
    setPassword("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect instantly to the homepage on submit
    triggerPageTransition("/");
  };

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkSize={10}
      sparkRadius={20}
      sparkCount={8}
      duration={400}
      className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-hidden bg-white px-4 py-12"
    >
      {/* Background Layers wrapped in React.memo to prevent re-render flicker */}
      <BackgroundLayers />

      {/* Top Spacer of matching height to bottom watermark to center the card vertically */}
      <div className="h-12 w-full shrink-0 select-none pointer-events-none" />

      {/* Main Glassmorphic Auth Card with layout transition */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="relative z-20 w-full max-w-md bg-white/45 backdrop-blur-xl border border-white/35 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col items-center select-none"
      >
        {/* Brand Header */}
        <motion.div layout className="flex flex-col items-center text-center mb-6">
          <Image
            src="/long_form_logo.png"
            alt="ATAL Logo"
            width={220}
            height={44}
            className="h-auto w-auto max-w-[200px] object-contain select-none pointer-events-none drop-shadow-sm mb-2"
          />
          <span
            style={{ fontFamily: "var(--font-questrial), sans-serif" }}
            className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-zinc-600"
          >
            Portal Access
          </span>
        </motion.div>

        {/* Tab Selector Pill Container */}
        <motion.div layout className="w-full flex justify-center mb-6">
          <div className="flex bg-zinc-900/10 backdrop-blur-xs p-1 rounded-full items-center gap-1 min-w-[200px] relative border border-black/5">
            <button
              type="button"
              onClick={() => handleToggle(false)}
              className={`relative flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                !isSignUp ? "text-blue-600" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              Sign In
              {!isSignUp && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white shadow-sm rounded-full -z-10 border border-blue-50/50"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleToggle(true)}
              className={`relative flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                isSignUp ? "text-blue-600" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              Sign Up
              {isSignUp && (
                <motion.div
                  layoutId="activeAuthTab"
                  className="absolute inset-0 bg-white shadow-sm rounded-full -z-10 border border-blue-50/50"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>
        </motion.div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {isSignUp && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="relative"
              >
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4 text-zinc-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white/70 border border-zinc-200/80 rounded-2xl py-3 pl-10 pr-4 text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200 shadow-2xs"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Email Address / Username
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 size-4 text-zinc-400" />
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="you@example.com or username"
                className="w-full bg-white/70 border border-zinc-200/80 rounded-2xl py-3 pl-10 pr-4 text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200 shadow-2xs"
              />
            </div>
          </motion.div>

          <motion.div layout>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => alert("Simulating reset verification link...")}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 size-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/70 border border-zinc-200/80 rounded-2xl py-3 pl-10 pr-10 text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                {/* Fixed Eye Icon toggle to match standard open eye on show, crossed eye on mask */}
                {showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </div>
          </motion.div>

          {/* Action Trigger Button matching Pixeloid style and reveal animation */}
          <motion.button
            layout
            type="submit"
            onHoverStart={() => setIsButtonHovered(true)}
            onHoverEnd={() => setIsButtonHovered(false)}
            animate={{
              backgroundColor: isButtonHovered ? "#f97316" : "#1b253c", // Turns orange on hover
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ fontFamily: "var(--font-pixeloid), monospace" }}
            className="w-full mt-2 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-md transition-shadow flex items-center justify-center cursor-pointer select-none group transform active:scale-98"
          >
            <div className="flex items-center justify-center">
              <span>{isSignUp ? "CREATE ACCOUNT" : "ACCESS PLATFORM"}</span>
              <motion.span
                animate={{
                  width: isButtonHovered ? "auto" : 0,
                  opacity: isButtonHovered ? 1 : 0,
                  marginLeft: isButtonHovered ? 8 : 0,
                }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="inline-flex items-center overflow-hidden shrink-0"
              >
                <ArrowRight className="size-4" />
              </motion.span>
            </div>
          </motion.button>
        </form>

        {/* Switch mode quick toggle footer */}
        <motion.div layout className="mt-6 text-xs font-bold text-zinc-500 text-center select-none">
          <span>{isSignUp ? "Already have an account? " : "New to the platform? "}</span>
          <button
            type="button"
            onClick={() => handleToggle(!isSignUp)}
            className="text-blue-600 hover:text-blue-700 transition-colors bg-transparent border-none p-0 cursor-pointer"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </motion.div>
      </motion.div>

      {/* Watermark in Pixeloid Font, perfectly centered horizontally using standard flex centering */}
      {/* Shifted slightly more to the right with 1.2em indent */}
      <div 
        style={{ 
          fontFamily: "var(--font-pixeloid), monospace",
          letterSpacing: "0.4em",
          textIndent: "1.2em"
        }} 
        className="text-4xl md:text-7xl font-bold text-black uppercase select-none pointer-events-none text-center z-20 w-full mt-12 flex justify-center items-center shrink-0"
      >
        ATAL
      </div>
    </ClickSpark>
  );
}
