"""ATAL maintenance scope policy — derived from hackathon problem statement."""
from __future__ import annotations

import re

# In-scope plant assets and maintenance vocabulary (heuristic allowlist)
ATAL_ASSET_CODES = (
    "srf", "hhpd", "fs", "hagcc", "apt", "tcms", "cgp", "hpak", "manas", "sansad", "atal",
)
MAINTENANCE_ALLOWLIST = (
    "loto", "lockout", "tagout", "rca", "root cause", "rul", "vibration", "bearing",
    "sensor", "telemetry", "anomaly", "diagnosis", "sop", "manual", "iso", "maintenance",
    "work order", "spare", "procurement", "downtime", "fault", "alarm", "threshold",
    "finishing stand", "galvaniz", "descaler", "mill", "furnace", "roll", "hydraulic",
    "lubrication", "oil cleanliness", "defect", "bottleneck", "urgency", "risk",
    "pickling", "strip", "inhibitor", "replenishment", "hcl", "acid bath",
)

# better_profanity false positives in steel-plant / metallurgy vocabulary
PROFANITY_ALLOWLIST_TERMS = frozenset({
    "strip", "strips", "stripping",  # steel strip, strip dwell (not profanity)
})

REFUSAL_MESSAGES = {
    "profanity": (
        "I can't process messages with abusive or inappropriate language. "
        "Please rephrase your maintenance question respectfully."
    ),
    "coding": (
        "MANAS supports steel-plant maintenance only — not general programming or code help. "
        "Ask about equipment faults, sensors, SOPs, RCA, or maintenance actions."
    ),
    "essay": (
        "MANAS is for industrial maintenance decision support, not essays or homework. "
        "Ask about diagnosis, root cause, risk, or repair steps for plant equipment."
    ),
    "off_topic": (
        "That request is outside MANAS scope (steel-plant maintenance). "
        "Try a question about equipment health, faults, SOPs, sensors, or maintenance planning."
    ),
}

STEER_HINT = (
    "Reframe as a steel-plant maintenance question about equipment diagnosis, sensors, "
    "SOPs, RCA, risk, or repair steps."
)

# Appended to MANAS / Qwen system prompts as second-line defense if input guard is bypassed
MANAS_SCOPE_GUARDRAILS = """
SCOPE GUARDRAILS (always enforce):
- You ONLY assist with steel-plant maintenance: equipment diagnosis, RCA, RUL, sensors/telemetry, \
anomalies, risk triage, repair steps, SOPs/manuals, spares, and work orders for \
SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK.
- Do NOT help with general programming, algorithms, data structures, coding tutorials, homework, \
essays, or unrelated general knowledge.
- If the user asks for code, CS algorithms (e.g. Dijkstra, sorting, LeetCode), or programming help \
without a clear plant-maintenance tie-in, refuse in 1–2 sentences and redirect to a maintenance question.
- Automation/SCADA scripting is in-scope ONLY when tied to a named asset, sensor, alarm, or maintenance task.
"""

# Obvious coding patterns — hard block
CODING_PATTERNS = [
    re.compile(r"\b(write|generate|create|debug|fix)\s+(me\s+)?(a\s+)?(python|javascript|java|c\+\+|rust|sql|html|css)\b", re.I),
    re.compile(r"\b(python|javascript|typescript)\s+(script|code|function|program)\b", re.I),
    re.compile(r"\b(def|class|import|from|const|let|var)\s+\w+", re.I),
    re.compile(r"```\s*(python|javascript|js|sql|java)", re.I),
    re.compile(r"\bleetcode\b|\bstack\s*overflow\b|\bcompile\s+this\s+code\b", re.I),
    re.compile(r"\bhow\s+to\s+(sort|reverse|parse)\s+(a\s+)?(list|array|string)\s+in\s+(python|java)", re.I),
    re.compile(r"\b(help|assist)\s+(me\s+)?(with\s+)?(code|coding|programming)\b", re.I),
    re.compile(r"\b(can|could)\s+(you|u)\s+help\s+(me\s+)?(with\s+)?(code|coding|programming)\b", re.I),
    re.compile(r"\b(coding|programming)\s+(problem|help|question|tutorial)s?\b", re.I),
    re.compile(r"\bhelp\s+(me\s+)?with\s+(python|javascript|java|c\+\+|rust|sql|typescript)\b", re.I),
    re.compile(r"\b(python|javascript|typescript|java|c\+\+|rust)\s+(problem|help|homework|assignment)s?\b", re.I),
    re.compile(r"\blike\s+(python|javascript|java|c\+\+|rust)\b", re.I),
    re.compile(
        r"\b(dijkstra|quicksort|mergesort|heapsort|bubblesort|binary\s+search|"
        r"bfs|dfs|dynamic\s+programming|big\s+o|graph\s+theory|linked\s+list|"
        r"hash\s+table|recursion|leetcode|hackerrank)\b",
        re.I,
    ),
    re.compile(r"\bhelp\s+(me\s+)?(with\s+)?(an?\s+)?[\w']*\s*algorithm", re.I),
    re.compile(
        r"\b(understand|learn|know)\s+(about\s+)?(an?\s+)?[\w']*\s*(algorithm|dijkstra)\b",
        re.I,
    ),
    re.compile(r"\b(explain|teach|show)\s+(me\s+)?(how\s+)?(an?\s+)?\w*\s*algorithm", re.I),
    re.compile(r"\b(data\s+structure|computer\s+science|competitive\s+programming)\b", re.I),
]

# Obvious essay / creative writing — hard block
ESSAY_PATTERNS = [
    re.compile(r"\b(write|draft|compose)\s+(an?\s+)?(essay|poem|story|novel|song|speech)\b", re.I),
    re.compile(r"\b(homework|assignment|thesis|dissertation)\s+(help|about|on)\b", re.I),
    re.compile(r"\b500\s*word\s+essay\b", re.I),
]

# Clear in-scope maintenance signals
MAINTENANCE_PATTERNS = [
    re.compile(r"\b(diagnos|fault|rca|root\s+cause|rul|anomal|vibration|bearing|sensor|alarm)\b", re.I),
    re.compile(r"\b(sop|manual|maintenance|repair|work\s+order|spare|loto)\b", re.I),
    re.compile(r"\b(srf|hhpd|finishing\s+stand|hagcc|tcms|cgp|hpak|apt)\b", re.I),
    re.compile(r"\b(iso\s*\d|threshold|urgency|risk|bottleneck|downtime)\b", re.I),
    re.compile(r"\bwhat\s+can\s+you\s+do\b|\byour\s+capabilit", re.I),
]

# Borderline general knowledge — steer
BORDERLINE_PATTERNS = [
    re.compile(r"\b(weather|recipe|movie|sport|football|cricket|politics|election)\b", re.I),
    re.compile(r"\b(who\s+is|what\s+is\s+the\s+capital|tell\s+me\s+a\s+joke)\b", re.I),
    re.compile(r"\b(stock\s+market|crypto|bitcoin|invest)\b", re.I),
]
