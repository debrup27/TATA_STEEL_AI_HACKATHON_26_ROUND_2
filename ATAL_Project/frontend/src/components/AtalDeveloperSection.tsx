"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LanguageTab = "Python" | "JavaScript" | "cURL";
type CapabilityId = "copilot" | "predictive" | "rca" | "digitisation";

interface CodeSnippet {
  Python: string;
  JavaScript: string;
  cURL: string;
}

interface CapabilityItem {
  id: CapabilityId;
  title: string;
  description: string;
  icon: React.ReactNode;
  snippets: CodeSnippet;
}

export default function AtalDeveloperSection() {
  const [activeCap, setActiveCap] = useState<CapabilityId>("copilot");
  const [activeTab, setActiveTab] = useState<LanguageTab>("Python");
  const [copied, setCopied] = useState(false);
  const [sdkCopied, setSdkCopied] = useState(false);

  const capabilities: CapabilityItem[] = [
    {
      id: "copilot",
      title: "Agent Copilot",
      description: "Autonomous troubleshooting and operations support.",
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      snippets: {
        Python: `from atal import ATALClient
from atal.models import AnomalyReport

# Initialize the developer client
client = ATALClient(api_key="YOUR_API_KEY")

# Start an autonomous troubleshooting session
session = client.copilot.start_session(
    asset_id="BF_TAPHOLE_DRILL",
    symptom="Motor winding temperature exceeded 95°C",
    telemetry={
        "vibration_rms": 4.8,
        "lubrication_pressure_bar": 1.2
    }
)

# Fetch structured troubleshooting actions
print("Status:", session.status)
print("Root Cause:", session.root_cause)
for action in session.recommended_actions:
    print(f"- [{action.priority}] {action.description}")`,
        JavaScript: `import { ATALClient } from "@atal/sdk";

// Initialize the developer client
const client = new ATALClient({ apiKey: "YOUR_API_KEY" });

// Start an autonomous troubleshooting session
const session = await client.copilot.startSession({
  assetId: "BF_TAPHOLE_DRILL",
  symptom: "Motor winding temperature exceeded 95°C",
  telemetry: {
    vibrationRms: 4.8,
    lubricationPressureBar: 1.2
  }
});

// Fetch structured troubleshooting actions
console.log(\`Status: \${session.status}\`);
console.log(\`Root Cause: \${session.rootCause}\`);
session.recommendedActions.forEach((action) => {
  console.log(\`- [\${action.priority}] \${action.description}\`);
});`,
        cURL: `curl -X POST https://api.atal.ai/v1/copilot/session \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "asset_id": "BF_TAPHOLE_DRILL",
    "symptom": "Motor winding temperature exceeded 95°C",
    "telemetry": {
      "vibration_rms": 4.8,
      "lubrication_pressure_bar": 1.2
    }
  }'

# Response format:
# {
#   "session_id": "sess_99a818c7",
#   "status": "active",
#   "root_cause": "Bearing lubrication breakdown",
#   "recommended_actions": [...]
# }`
      }
    },
    {
      id: "predictive",
      title: "Predictive Health",
      description: "Anomaly detection and RUL forecast across assets.",
      icon: (
        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      snippets: {
        Python: `from atal import ATALClient
from atal.analytics import ForecastModel

# Initialize the developer client
client = ATALClient(api_key="YOUR_API_KEY")

# Retrieve remaining useful life (RUL) & anomalies
health = client.analytics.get_health(
    asset_id="BF_TAPHOLE_DRILL",
    include_forecast=True
)

print(f"RUL Estimate: {health.rul_days} days")
print(f"Confidence Level: {health.confidence_score * 100}%")
print(f"Anomaly Risk: {health.anomaly_score}")

# Check degradation trends
for trend in health.degradation_trends:
    print(f"Metric: {trend.metric_name} | Rate: {trend.rate_of_change}")`,
        JavaScript: `import { ATALClient } from "@atal/sdk";

// Initialize the developer client
const client = new ATALClient({ apiKey: "YOUR_API_KEY" });

// Retrieve health analytics
const health = await client.analytics.getHealth({
  assetId: "BF_TAPHOLE_DRILL",
  includeForecast: true
});

console.log(\`RUL Estimate: \${health.rulDays} days\`);
console.log(\`Confidence: \${health.confidenceScore * 100}%\`);
console.log(\`Anomaly Risk: \${health.anomalyScore}\`);

// Check degradation trends
health.degradationTrends.forEach((trend) => {
  console.log(\`Metric: \${trend.metricName} | Rate: \${trend.rateOfChange}\`);
});`,
        cURL: `curl -X GET https://api.atal.ai/v1/analytics/health/BF_TAPHOLE_DRILL \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: application/json"

# Response format:
# {
#   "asset_id": "BF_TAPHOLE_DRILL",
#   "rul_days": 14,
#   "confidence_score": 0.89,
#   "degradation_trends": [...]
# }`
      }
    },
    {
      id: "rca",
      title: "Root Cause Analysis",
      description: "Deep diagnostics and fault tree mapping.",
      icon: (
        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      snippets: {
        Python: `from atal import ATALClient
from atal.rca import DiagnosticEngine

# Initialize the developer client
client = ATALClient(api_key="YOUR_API_KEY")

# Run root cause analysis (RCA) on telemetry
rca = client.rca.analyze(
    event_id="EVT_9921_DRILL",
    telemetry={"vibration": 4.8, "temp": 98.2},
    depth="comprehensive"
)

print(f"Analysis Status: {rca.status}")
print(f"Main Contributor: {rca.primary_contributor}")

# List all possible failure modes
for cause in rca.probable_causes:
    print(f"{cause.name}: {cause.confidence}% confidence")
    print(f"  Isolation steps: {cause.isolation_steps}")`,
        JavaScript: `import { ATALClient } from "@atal/sdk";

// Initialize the developer client
const client = new ATALClient({ apiKey: "YOUR_API_KEY" });

// Perform root cause analysis
const rca = await client.rca.analyze({
  eventId: "EVT_9921_DRILL",
  telemetry: { vibration: 4.8, temp: 98.2 },
  depth: "comprehensive"
});

console.log(\`Status: \${rca.status}\`);
console.log(\`Main Contributor: \${rca.primaryContributor}\`);

// List failure modes
rca.probableCauses.forEach((cause) => {
  console.log(\`\${cause.name}: \${cause.confidence}%\`);
});`,
        cURL: `curl -X POST https://api.atal.ai/v1/rca/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_id": "EVT_9921_DRILL",
    "telemetry": {"vibration": 4.8, "temp": 98.2},
    "depth": "comprehensive"
  }'`
      }
    },
    {
      id: "digitisation",
      title: "Manual Digitisation",
      description: "Digitize maintenance manuals and search SOPs.",
      icon: (
        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      snippets: {
        Python: `from atal import ATALClient
from atal.documents import ProcessingConfig

# Initialize the developer client
client = ATALClient(api_key="YOUR_API_KEY")

# Upload and digitize equipment technical manuals
result = client.documents.digitize(
    file_path="./manuals/bf_taphole_drill.pdf",
    document_type="manual",
    enable_ocr=True,
    extract_tables=True
)

print(f"Processed {result.pages_parsed} pages successfully.")
print(f"Identified {len(result.tables_found)} structural tables.")
print(f"Vector embeddings generated: {result.embeddings_count}")`,
        JavaScript: `import { ATALClient } from "@atal/sdk";
import fs from "fs";

// Initialize the developer client
const client = new ATALClient({ apiKey: "YOUR_API_KEY" });

// Digitize manual document
const manualStream = fs.createReadStream("./manuals/bf_taphole_drill.pdf");
const result = await client.documents.digitize({
  file: manualStream,
  documentType: "manual",
  enableOcr: true,
  extractTables: true
});

console.log(\`Parsed \${result.pagesParsed} pages.\`);
console.log(\`Found \${result.tablesFound.length} tables.\`);`,
        cURL: `curl -X POST https://api.atal.ai/v1/documents/digitize \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@./manuals/bf_taphole_drill.pdf" \\
  -F "document_type=manual" \\
  -F "enable_ocr=true" \\
  -F "extract_tables=true"`
      }
    }
  ];

  const currentSnippet = capabilities.find((c) => c.id === activeCap)?.snippets[activeTab] || "";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySdk = () => {
    navigator.clipboard.writeText("pip install atal-sdk");
    setSdkCopied(true);
    setTimeout(() => setSdkCopied(false), 2000);
  };

  const syntaxHighlight = (code: string) => {
    const lines = code.split("\n");
    return lines.map((line, idx) => {
      // Basic keyword replacement for high visual styling in light theme
      const rendered = line
        .replace(/(".*?")|('.*?')/g, '<span class="text-green-600 font-semibold">$1$2</span>')
        .replace(/\b(from|import|const|let|await|new|return|for|in|print|console)\b/g, '<span class="text-purple-600 font-bold">$1</span>')
        .replace(/\b(ATALClient|client|session|health|rca|result|document_type|file_path|asset_id|symptom|telemetry|event_id|include_forecast|enable_ocr|extract_tables|includeForecast|enableOcr|extractTables|ocr|tables)\b/g, '<span class="text-blue-600 font-semibold">$1</span>')
        .replace(/(#.*|\/\/.*)/g, '<span class="text-zinc-400 italic">$1</span>');

      return (
        <div key={idx} className="flex leading-6 font-mono text-xs md:text-sm">
          <span className="w-8 text-zinc-300 text-right select-none pr-4 font-mono">{idx + 1}</span>
          <span className="text-zinc-700" dangerouslySetInnerHTML={{ __html: rendered }} />
        </div>
      );
    });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 mt-16 border-t border-zinc-100 pt-16">
      {/* Heading */}
      <div className="text-center mb-10 max-w-4xl px-4">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 mb-2 leading-tight font-sans">
          Build anything with <span className="text-blue-600">ATAL APIs</span>
        </h2>
        <p className="text-sm md:text-base text-zinc-500 font-medium select-none">
          Everything you need to add Asset Intelligence & Troubleshooting to your plant operations.
        </p>
      </div>

      {/* Main Grid: Left Panel & Right Panel (Expanded to max-w-6xl) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full max-w-6xl">
        
        {/* Left Panel: Code Integration Widget (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between border border-zinc-100/80 rounded-3xl p-6 bg-zinc-50/20 relative min-h-[480px]">
          <div>
            {/* Title */}
            <div className="flex items-center justify-between mb-4 select-none">
              <h3 className="text-lg font-bold text-zinc-800 font-sans">
                Add <span className="text-blue-600 font-bold">{capabilities.find(c => c.id === activeCap)?.title}</span> to your app in minutes
              </h3>
            </div>

            {/* Code Block Container */}
            <div className="relative bg-zinc-50/70 rounded-2xl overflow-hidden border border-zinc-200/60 shadow-inner flex flex-col justify-between">
              
              {/* Header Bar inside Code Block */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-100/80 border-b border-zinc-200/50 select-none">
                {/* Tabs */}
                <div className="flex items-center gap-1.5">
                  {([
                    { name: "Python", icon: <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 110 110" fill="currentColor"><path d="M52.3 2C30 2 31.8 11.5 31.8 11.5l.1 9.8H53v2.8H21.5C9.8 24 2 32.3 2 44.5c0 12.3 9.4 11.8 9.4 11.8h8.4v-11c0-6.8 5.7-12.7 12.5-12.7h23.5V20.2s-.3-18.2-31.5-18.2zM57.7 108c22.3 0 20.5-9.5 20.5-9.5l-.1-9.8H57v-2.8h31.5c11.7 0 19.5-8.3 19.5-20.5 0-12.3-9.4-11.8-9.4-11.8h-8.4v11c0 6.8-5.7 12.7-12.5 12.7H64.2V89.8s.3 18.2 31.5 18.2z" /></svg> },
                    { name: "JavaScript", icon: <div className="w-3.5 h-3.5 bg-yellow-400 text-black font-extrabold text-[9px] flex items-center justify-center rounded-sm leading-none">JS</div> },
                    { name: "cURL", icon: <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" /></svg> }
                  ] as { name: LanguageTab; icon: React.ReactNode }[]).map((tab) => {
                    const isActive = activeTab === tab.name;
                    return (
                      <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive ? "text-zinc-800 bg-white shadow-xs border border-zinc-200/30" : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 select-none cursor-pointer"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600 animate-scale-up" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Text lines wrapper with NO SCROLL (overflow-hidden) */}
              <div className="relative h-[250px] overflow-hidden p-5 bg-white select-text">
                <div className="font-mono overflow-hidden h-full pr-4 pb-12">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeCap}-${activeTab}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                    >
                      {syntaxHighlight(currentSnippet)}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Fade out linear gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
              </div>

            </div>
          </div>

          {/* Action button at bottom */}
          <div className="mt-6 flex justify-center">
            <button className="bg-[#1b253c] hover:bg-blue-600 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-full transition-all duration-300 shadow-md cursor-pointer transform hover:scale-105 active:scale-95">
              Get your API key & get started
            </button>
          </div>
        </div>

        {/* Right Panel: Capability Cards in a 2x2 Grid Layout */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch select-none">
          {capabilities.map((item) => {
            const isSelected = activeCap === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveCap(item.id)}
                className={`relative flex flex-col justify-between p-5 rounded-3xl cursor-pointer transition-all duration-300 border min-h-[170px] ${
                  isSelected
                    ? "bg-white border-zinc-950 shadow-md ring-1 ring-zinc-950/5"
                    : "bg-white border-zinc-100 hover:border-zinc-200/80 hover:bg-zinc-50/30"
                } group overflow-hidden`}
              >
                {/* Visual bubble element on top right like reference screenshot */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-300/20 via-orange-300/15 to-transparent rounded-full filter blur-lg pointer-events-none -z-10 animate-pulse" />
                )}

                {/* Top Row: Icon holder */}
                <div
                  className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs ${
                    isSelected ? "bg-zinc-50" : "bg-zinc-50 group-hover:bg-white"
                  }`}
                >
                  {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                    className: `w-5 h-5 transition-colors duration-300 ${isSelected ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-600"}`
                  })}
                </div>

                {/* Bottom Row: Text content */}
                <div className="mt-4">
                  <h4 className={`text-sm md:text-base font-bold transition-colors duration-200 ${isSelected ? "text-zinc-950" : "text-zinc-700 group-hover:text-zinc-900"}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row of 3 Cards (Expanded to max-w-6xl) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-8 select-none">
        
        {/* Card 1: REST API */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div>
            <h4 className="text-base font-bold text-zinc-900">REST API</h4>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1.5">
              Clean, well-documented endpoints for seamless operations and MES system integrations.
            </p>
          </div>
        </div>

        {/* Card 2: Python SDK */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div>
            <h4 className="text-base font-bold text-zinc-900">Python SDK</h4>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1.5">
              Integrate in Python environments with a simple package.
            </p>
          </div>
          
          <div className="mt-4 flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl px-3.5 py-2">
            <code className="text-[11px] font-mono text-zinc-600 font-bold select-all">
              pip install atal-sdk
            </code>
            <button
              onClick={handleCopySdk}
              className="text-zinc-400 hover:text-blue-600 transition-colors duration-150 cursor-pointer"
              aria-label="Copy SDK Install Command"
            >
              {sdkCopied ? (
                <span className="text-[10px] font-bold text-green-500">Copied!</span>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Playground */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div>
            <h4 className="text-base font-bold text-zinc-900">Playground</h4>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1.5">
              Interact with models and simulate sensor anomalies live in the sandbox.
            </p>
          </div>
          <div className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer self-start flex items-center gap-1 group">
            <span>Test in browser</span>
            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}
