"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface TabItem {
  id: "atal_sansad" | "atal_manas";
  label: string;
  icon: React.ReactNode;
}

interface RightPanelItem {
  title: string;
  badgeText: string;
  badgeType: "critical" | "warning" | "healthy" | "info";
  subtext: string;
  iconBgColor: string;
  icon: React.ReactNode;
}

export default function AtalDisplayModal() {
  const [activeTab, setActiveTab] = useState<"atal_sansad" | "atal_manas">("atal_sansad");
  const [language, setLanguage] = useState("English");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const languages = ["English", "Hindi", "Odia", "Bengali"];
  const [inputText, setInputText] = useState(
    "Friction levels in the Blast Furnace taphole drill are rising; motor winding temperature has exceeded 95°C. Check alignment and lubrication states immediately."
  );

  const handleTabChange = (tabId: "atal_sansad" | "atal_manas") => {
    setActiveTab(tabId);
    if (tabId === "atal_sansad") {
      setInputText(
        "Friction levels in the Blast Furnace taphole drill are rising; motor winding temperature has exceeded 95°C. Check alignment and lubrication states immediately."
      );
    } else {
      setInputText(
        "Predictive health scan query: Retrieve remaining useful life (RUL) data for Hot Strip Mill Roller Coiler and Oxygen Lance Elevation Motor."
      );
    }
  };

  const tabs: TabItem[] = [
    {
      id: "atal_sansad",
      label: "ATAL Sansad",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: "atal_manas",
      label: "ATAL Manas",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  const sansadAlerts: RightPanelItem[] = [
    {
      title: "Bearing Seizure Risk",
      badgeText: "Critical",
      badgeType: "critical",
      subtext: "Delay Severity: High • Spares: In Stock",
      iconBgColor: "#3b82f6",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      title: "Lubrication Degradation",
      badgeText: "Warning",
      badgeType: "warning",
      subtext: "Delay Severity: Medium • Spares: Available",
      iconBgColor: "#22c55e",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      title: "Gearbox Alignment Drift",
      badgeText: "Urgent",
      badgeType: "warning",
      subtext: "Delay Severity: High • Spares: Lead Time 12d",
      iconBgColor: "#ef4444",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: "Motor Thermal Overload",
      badgeText: "Moderate",
      badgeType: "info",
      subtext: "Delay Severity: Low • Spares: In Stock",
      iconBgColor: "#eab308",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      )
    }
  ];

  const manasPredictions: RightPanelItem[] = [
    {
      title: "BF Taphole Drill",
      badgeText: "RUL: 14d",
      badgeType: "critical",
      subtext: "Degradation Rate: Fast • Risk: High",
      iconBgColor: "#3b82f6",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "HSM Roller Coiler",
      badgeText: "RUL: 45d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Normal • Risk: Low",
      iconBgColor: "#22c55e",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "BOF Lance Motor",
      badgeText: "RUL: 8d",
      badgeType: "critical",
      subtext: "Degradation Rate: Accelerated • Risk: High",
      iconBgColor: "#ef4444",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Sinter Exhaust Blower",
      badgeText: "RUL: 120d",
      badgeType: "healthy",
      subtext: "Degradation Rate: Minimal • Risk: Normal",
      iconBgColor: "#eab308",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  const activeAlerts = activeTab === "atal_sansad" ? sansadAlerts : manasPredictions;

  const countWords = (text: string) => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      {/* Dynamic Text on Top describing Tata Steel Challenge and ATAL Copilot */}
      <div className="text-center mb-8 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl tracking-tight text-zinc-950 mb-2 select-none flex flex-wrap justify-center items-center gap-x-2 md:gap-x-3 leading-tight font-sans">
          <span className="font-thin italic text-zinc-500">Reliable infrastructure</span>
          <span className="font-extrabold text-zinc-900">to manage factories</span>
        </h2>
      </div>

      {/* Main Display Modal Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col transition-all duration-300">
        
        {/* Navigation Tabs Pill Container */}
        <div className="w-full flex justify-start md:justify-center overflow-x-auto pb-4 mb-6 border-b border-zinc-50 scrollbar-none">
          <div className="flex bg-zinc-100/70 p-1.5 rounded-full items-center gap-1.5 min-w-max relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer select-none z-10 ${
                    isActive ? "text-blue-600" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span className={isActive ? "text-blue-600" : "text-zinc-400"}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(59,130,246,0.15)] border border-blue-50/50 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Main Grid splits Left / Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Description Input Section (8 Columns) */}
          <div className="md:col-span-7 flex flex-col justify-between border border-zinc-100 rounded-2xl p-6 bg-zinc-50/40 relative min-h-[300px]">
            <div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={2000}
                className="w-full h-48 bg-transparent text-sm md:text-base font-semibold text-zinc-800 placeholder-zinc-400 border-none resize-none focus:outline-none focus:ring-0 leading-relaxed font-sans"
                placeholder="Type here..."
              />
            </div>

            {/* Bottom Controls of Left Panel */}
            <div className="flex flex-col gap-4">
              {/* Counters */}
              <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 select-none">
                <span>{countWords(inputText)} words</span>
                <span>{inputText.length}/2000</span>
              </div>

              {/* Selector and Action Button */}
              <div className="flex justify-between items-center pt-2">
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 bg-white border border-zinc-200/80 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm select-none"
                  >
                    <span>{language}</span>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Overlay background to dismiss when clicking outside */}
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setDropdownOpen(false)} />
                      
                      {/* Floating custom dropdown */}
                      <div className="absolute bottom-full mb-2 left-0 min-w-[120px] bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom">
                        {languages.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setLanguage(lang);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-zinc-50 transition-colors duration-150 block cursor-pointer ${
                              language === lang ? "text-blue-600 bg-blue-50/30" : "text-zinc-600"
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Main Blue Trigger Action Button */}
                <button className="w-12 h-12 rounded-full bg-[#1b253c] hover:bg-blue-600 text-white flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer transform hover:scale-105 active:scale-95">
                  <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Side Status list / Alert list (5 Columns) */}
          <div className="md:col-span-5 flex flex-col justify-between p-1">
            <div>
              {/* Header inside Panel */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-zinc-800 select-none">
                  {activeTab === "atal_sansad" ? "Incident Log" : "Asset Health"}
                </h3>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer select-none">
                  View all
                </button>
              </div>

              {/* List of items */}
              <div className="flex flex-col gap-4">
                {activeAlerts.map((item, index) => {
                  // Determine badge styling based on badgeType
                  let badgeColors = "bg-blue-50 text-blue-600";
                  if (item.badgeType === "critical") {
                    badgeColors = "bg-red-50 text-red-600";
                  } else if (item.badgeType === "warning") {
                    badgeColors = "bg-orange-50 text-orange-600";
                  } else if (item.badgeType === "healthy") {
                    badgeColors = "bg-green-50 text-green-600";
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-zinc-50/70 border border-transparent hover:border-zinc-100 transition-all duration-300 group cursor-pointer"
                    >
                      {/* Colored play/avatar rounded square */}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm"
                        style={{ backgroundColor: item.iconBgColor }}
                      >
                        {item.icon}
                      </div>

                      {/* Content block */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-zinc-800 truncate">
                            {item.title}
                          </h4>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide select-none ${badgeColors}`}>
                            {item.badgeText}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-zinc-400 truncate">
                          {item.subtext}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer inside Right Panel */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-500 select-none">
                Export to Dashboard?
              </span>
              <button className="bg-[#1b253c] hover:bg-zinc-800 text-white text-[11px] font-bold px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer shadow-md transform hover:scale-105 active:scale-95 select-none">
                Generate action plan
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Button below card */}
      <button className="mt-8 bg-white border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-6 py-3.5 rounded-full transition-all duration-300 cursor-pointer shadow-sm select-none transform hover:scale-105 active:scale-95">
        Initialize Agent Copilot
      </button>
    </div>
  );
}
