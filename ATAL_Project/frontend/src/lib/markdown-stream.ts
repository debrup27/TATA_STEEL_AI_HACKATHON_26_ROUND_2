/** Close dangling markdown / math markers so partial streams still render. */
export function prepareStreamingMarkdown(text: string): string {
  if (!text) return text;

  let out = text;

  const fenceCount = (out.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) out += "\n```";

  let backticks = 0;
  let inFence = false;
  for (let i = 0; i < out.length; i++) {
    if (out.startsWith("```", i)) {
      inFence = !inFence;
      i += 2;
      continue;
    }
    if (!inFence && out[i] === "`") backticks++;
  }
  if (backticks % 2 !== 0) out += "`";

  const boldCount = (out.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) out += "**";

  if (!inFence) {
    let inBlockMath = false;
    let inlineMath = 0;
    for (let i = 0; i < out.length; i++) {
      if (out.startsWith("$$", i)) {
        inBlockMath = !inBlockMath;
        i += 1;
        continue;
      }
      if (!inBlockMath && out[i] === "$" && out[i - 1] !== "\\") {
        inlineMath++;
      }
    }
    if (inBlockMath) out += "$$";
    else if (inlineMath % 2 !== 0) out += "$";
  }

  return out;
}

const UNICODE_SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const UNICODE_SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾";
const PROTECTED_SEGMENT =
  /(`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;

const GREEK_TO_LATEX: Record<string, string> = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  μ: "\\mu",
  λ: "\\lambda",
  θ: "\\theta",
  σ: "\\sigma",
  π: "\\pi",
  φ: "\\phi",
  Ω: "\\Omega",
  ω: "\\omega",
};

const CMP_TO_LATEX: Record<string, string> = {
  "≥": "\\geq",
  "<=": "\\leq",
  "≤": "\\leq",
  ">=": "\\geq",
};

const CHEM_UNICODE: Record<string, string> = {
  "H\u2082S": "$H_{2}S$",
  "H\u2082": "$H_{2}$",
  "CO\u2082": "$CO_{2}$",
  "O\u2082": "$O_{2}$",
  "N\u2082": "$N_{2}$",
  "FeCl\u2082": "$FeCl_{2}$",
  "Fe\u2082": "$Fe_{2}$",
};

/** e.g. FeCl₂ → $FeCl_{2}$ (must run before bare digit substitution). */
const UNICODE_SUB_FORMULA = /((?:[A-Z][a-z]?)+)([₀₁₂₃₄₅₆₇₈₉]+)/g;

/** $FeCl$ with subscript digits outside the math delimiters. */
const SPLIT_MATH_SUB = /\$([^$\n]+)\$\s*_?(\d{1,2})\b/g;

/** Un-glue markdown table rows compacted onto one line (common LLM / API flattening). */
export function repairCollapsedMarkdownTables(text: string): string {
  if (!text || !text.includes("|")) return text;
  let out = text;
  // "| cell ||---|" or "| cell || next row |"
  out = out.replace(/\|\s*\|(?=-)/g, "|\n|");
  out = out.replace(/\|\s*\|(?=\|)/g, "|\n|");
  // "events | |---" missing newline before separator
  out = out.replace(/\|\s+\|(-{3,})/g, "|\n|$1");
  return out;
}

/** Full pipeline for MANAS assistant text (chemistry, ISO codes, broken LLM markup). */
export function normalizeTechnicalMarkdown(text: string): string {
  if (!text) return text;
  let t = text;
  for (const [raw, math] of Object.entries(CHEM_UNICODE)) {
    t = t.split(raw).join(math);
  }
  // Fix broken $…$ delimiter splits before touching well-formed math blocks.
  t = repairSplitChemistryMath(t);
  t = mergeSplitMathSubscripts(t);
  return mapOutsideProtected(t, (segment) => {
    let s = segment;
    s = wrapUnicodeSubscriptFormulas(s);
    s = wrapScientificExpressions(s);
    s = wrapGreekUnicodeScripts(s);
    s = wrapUnicodeSuperscripts(s);
    s = normalizeTechnicalSegment(s);
    return s;
  });
}

function latexGreek(char: string): string {
  return GREEK_TO_LATEX[char] ?? char;
}

function unicodeSubDigits(s: string): string {
  return [...s]
    .map((ch) => {
      const i = UNICODE_SUBSCRIPTS.indexOf(ch);
      return i >= 0 ? String(i) : "";
    })
    .join("");
}

function unicodeSupDigits(s: string): string {
  const map: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁺": "+", "⁻": "-", "⁼": "-", "⁽": "(", "⁾": ")",
  };
  return [...s].map((ch) => map[ch] ?? "").join("");
}

function repairSplitChemistryMath(s: string): string {
  let out = s;
  // $FeCl$₂ — unicode subscript glued outside math delimiters
  out = out.replace(
    /\$([^$\n]+)\$([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (_, inner: string, subs: string) => `$${fixMathBody(inner)}_{${unicodeSubDigits(subs)}}$`,
  );
  // $FeCl$_2 — underscore subscript before closing $
  out = out.replace(
    /\$([^$\n]+)\$_(\d{1,2})\b/g,
    (_, inner: string, sub: string) => `$${fixMathBody(inner)}_{${sub}}$`,
  );
  // FeCl$_2$ — opening $ missing
  out = out.replace(
    /\b((?:[A-Z][a-z]?)+)\$_(\d{1,2})\$/g,
    (_, elems: string, sub: string) => `$${elems}_{${sub}}$`,
  );
  // $FeCl$ 2 / $FeCl$_{2} — subscript digits after closing $ (require a real subscript)
  out = out.replace(
    /\$([^$\n]+)\$(?:\s*_(\d{1,2})|\s*\{(\d{1,2})\})/g,
    (_, inner: string, subA: string, subB: string) => {
      const sub = subA ?? subB;
      return `$${fixMathBody(inner)}_{${sub}}$`;
    },
  );
  return out;
}

/** β₁₀, μₘ, x₂ — unicode subscripts on greek or single letters. */
function wrapGreekUnicodeScripts(s: string): string {
  let out = s.replace(
    /([αβγδμλθσπφΩω])([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (_, g: string, subs: string) => {
      const d = unicodeSubDigits(subs);
      return d ? `$${latexGreek(g)}_{${d}}$` : `${g}${subs}`;
    },
  );
  out = out.replace(
    /([A-Za-z])([₀₁₂₃₄₅₆₇₈₉]+)/g,
    (full, base: string, subs: string) => {
      if (full.includes("$")) return full;
      const d = unicodeSubDigits(subs);
      return d ? `$${base}_{${d}}$` : full;
    },
  );
  return out;
}

/** m², 10⁶, cm³ — unicode superscripts. */
function wrapUnicodeSuperscripts(s: string): string {
  let out = s.replace(
    /(\d+(?:\.\d+)?)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]+)/g,
    (full, base: string, sup: string) => {
      if (full.includes("$")) return full;
      const exp = unicodeSupDigits(sup);
      return exp ? `$${base}^{${exp}}$` : full;
    },
  );
  out = out.replace(
    /([A-Za-zμ]+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,
    (full, base: string, sup: string) => {
      if (full.includes("$")) return full;
      const exp = unicodeSupDigits(sup);
      if (!exp) return full;
      const latexBase = base === "μ" ? "\\mu" : base;
      return `$${latexBase}^{${exp}}$`;
    },
  );
  return out;
}

/** β₁₀(c) ≥ 200, β_10(c), 10^6, x^2 — scientific / filtration notation. */
function wrapScientificExpressions(s: string): string {
  let out = s;

  out = out.replace(
    /([αβγδμλθσπφΩω])([₀₁₂₃₄₅₆₇₈₉]+)\s*\(\s*([a-zA-Z])\s*\)\s*(≥|<=|≤|>=)\s*(\d+(?:\.\d+)?)/g,
    (_, g: string, subs: string, arg: string, cmp: string, val: string) => {
      const d = unicodeSubDigits(subs);
      const op = CMP_TO_LATEX[cmp] ?? cmp;
      return `$${latexGreek(g)}_{${d}}(${arg}) ${op} ${val}$`;
    },
  );

  out = out.replace(
    /([αβγδμλθσπφΩω])([₀₁₂₃₄₅₆₇₈₉]+)\s*\(\s*([a-zA-Z])\s*\)/g,
    (_, g: string, subs: string, arg: string) => {
      const d = unicodeSubDigits(subs);
      return `$${latexGreek(g)}_{${d}}(${arg})$`;
    },
  );

  out = out.replace(
    /([αβγδμλθσπφΩω])_(\d+)\s*\(\s*([a-zA-Z])\s*\)\s*(≥|<=|≤|>=)\s*(\d+(?:\.\d+)?)/g,
    (_, g: string, sub: string, arg: string, cmp: string, val: string) => {
      const op = CMP_TO_LATEX[cmp] ?? cmp;
      return `$${latexGreek(g)}_{${sub}}(${arg}) ${op} ${val}$`;
    },
  );

  out = out.replace(
    /([αβγδμλθσπφΩω])_(\d+)(\([a-zA-Z]+\))?/g,
    (_, g: string, sub: string, tail = "") =>
      `$${latexGreek(g)}_{${sub}}${tail}$`,
  );

  out = out.replace(
    /\b([αβ])10(\([cC]\))/g,
    (_, g: string, tail: string) => `$${latexGreek(g)}_{10}${tail}$`,
  );

  out = out.replace(
    /([αβγδμλθσπφΩω])\s*\(\s*([a-zA-Z])\s*\)\s*(≥|<=|≤|>=)\s*(\d+(?:\.\d+)?)/g,
    (_, g: string, arg: string, cmp: string, val: string) => {
      const op = CMP_TO_LATEX[cmp] ?? cmp;
      return `$${latexGreek(g)}(${arg}) ${op} ${val}$`;
    },
  );

  out = out.replace(
    /\b(\d+(?:\.\d+)?)\^([0-9+-]+)/g,
    (full, base: string, exp: string) => (full.includes("$") ? full : `$${base}^{${exp}}$`),
  );

  out = out.replace(
    /\b([A-Za-zμ])_(\d+)\b/g,
    (full, base: string, sub: string) => {
      if (full.includes("$")) return full;
      const latexBase = base === "μ" ? "\\mu" : base;
      return `$${latexBase}_{${sub}}$`;
    },
  );

  return out;
}

/** @deprecated Use normalizeTechnicalMarkdown */
export function protectChemicalSubscripts(text: string): string {
  return normalizeTechnicalMarkdown(text);
}

function mapOutsideProtected(
  text: string,
  fn: (segment: string) => string,
): string {
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(PROTECTED_SEGMENT.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(fn(text.slice(last, m.index)));
    parts.push(normalizeMathDelimiters(m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(fn(text.slice(last)));
  return parts.join("");
}

function normalizeMathDelimiters(block: string): string {
  if (block.startsWith("```") || block.startsWith("`")) return block;
  if (block.startsWith("$$")) {
    const inner = block.slice(2, -2);
    return `$$${fixMathBody(inner)}$$`;
  }
  if (block.startsWith("$") && block.endsWith("$")) {
    return `$${fixMathBody(block.slice(1, -1))}$`;
  }
  return block;
}

function fixMathBody(body: string): string {
  let out = body;
  for (const [g, latex] of Object.entries(GREEK_TO_LATEX)) {
    out = out.split(g).join(latex);
  }
  return out
    .replace(/((?:[A-Z][a-z]?)+)_(\d+)([A-Za-z]{0,4})/g, "$1_{$2}$3")
    .replace(/((?:[A-Z][a-z]?)+)(\d{1,2})(?![0-9a-zA-Z_])/g, "$1_{$2}")
    .replace(/(\\[a-z]+)_(\d+)/g, "$1_{$2}");
}

function normalizeTechnicalSegment(segment: string): string {
  let s = segment;

  for (const [raw, math] of Object.entries(CHEM_UNICODE)) {
    s = s.split(raw).join(math);
  }

  s = normalizeUnicodeSubscripts(s);
  s = fixBrokenChemBrackets(s);
  s = fixSpacedChemTokens(s);
  s = escapeTechnicalUnderscores(s);
  s = wrapBareChemicalFormulas(s);

  return s;
}

function wrapUnicodeSubscriptFormulas(s: string): string {
  return s.replace(UNICODE_SUB_FORMULA, (_, elems: string, subs: string) => {
    const digits = [...subs]
      .map((ch) => {
        const i = UNICODE_SUBSCRIPTS.indexOf(ch);
        return i >= 0 ? String(i) : "";
      })
      .join("");
    return digits ? `$${elems}_{${digits}}$` : `${elems}${subs}`;
  });
}

function mergeSplitMathSubscripts(s: string): string {
  return s.replace(SPLIT_MATH_SUB, (_, formula: string, sub: string) => {
    const inner = fixMathBody(formula.trim());
    return `$${inner}_{${sub}}$`;
  });
}

function normalizeUnicodeSubscripts(s: string): string {
  // Only flatten orphan subscript digits (e.g. ISO 17945₂), not β₁₀ (handled earlier).
  return s.replace(/(\d)([₀₁₂₃₄₅₆₇₈₉])(?![₀₁₂₃₄₅₆₇₈₉])/g, (_, lead, sub) => {
    const i = UNICODE_SUBSCRIPTS.indexOf(sub);
    return i >= 0 ? `${lead}${i}` : `${lead}${sub}`;
  });
}

/** LLM often writes `[H_2S Environments):` instead of `(H₂S Environments):`. */
function fixBrokenChemBrackets(s: string): string {
  return s
    .replace(
      /\[\s*H\s*_?\s*2\s*_?\s*S\s+([A-Za-z][^:\]\)]*?)\s*\)\s*:/g,
      "(H_2S $1):",
    )
    .replace(
      /\[\s*H\s+S\s+([A-Za-z][^:\]\)]*?)\s*\)\s*:/g,
      "(H_2S $1):",
    )
    .replace(
      /\[\s*H\s*_?\s*2\s*_?\s*S\s+([A-Za-z][^:\]\)]*?)\s*\)/g,
      "(H_2S $1)",
    )
    .replace(
      /\[\s*H\s+S\s+([A-Za-z][^:\]\)]*?)\s*\)/g,
      "(H_2S $1)",
    )
    .replace(/\[\s*H_2S\s*([:\)\]])/g, "(H_2S)$1")
    .replace(
      /\(\s*H\s*_?\s*2\s*_?\s*S\s+([A-Za-z])/g,
      "(H_2S $1",
    );
}

/** Prevent markdown `_` emphasis on ISO_15156, NACE_MR0175, etc. */
function escapeTechnicalUnderscores(s: string): string {
  return s
    .replace(/\b([A-Z]{2,}(?:_[A-Z0-9]+)+)\b/g, (m) => m.replace(/_/g, "\\_"))
    .replace(/\b([A-Z]+)_(\d{3,6})\b/g, "$1\\_$2");
}

function wrapBareChemicalFormulas(s: string): string {
  let out = s.replace(
    /\b((?:[A-Z][a-z]?)+)_\{(\d{1,2})\}/g,
    (_, elems: string, sub: string) => `$${elems}_{${sub}}$`,
  );
  out = out.replace(
    /\b((?:[A-Z][a-z]?)+)_(\d{1,2})([A-Za-z]{0,4})(?![0-9a-zA-Z_])/g,
    (_, elems: string, sub: string, tail: string) => `$${elems}_{${sub}}${tail}$`,
  );
  out = out.replace(
    /\b((?:[A-Z][a-z]?)+)(\d{1,2})(?![0-9a-zA-Z_])/g,
    (full, elems: string, sub: string) => {
      if (full.includes("$")) return full;
      if (/^[A-Z]{3,}$/.test(elems)) return full;
      if (elems.length === 1 && sub.length > 1) return full;
      return `$${elems}_{${sub}}$`;
    },
  );
  return out;
}

/** `[H S` / `H 2 S` fragments left after emphasis breaks. */
function fixSpacedChemTokens(s: string): string {
  return s
    .replace(/\[\s*H\s+S\b/g, "H_2S")
    .replace(/\bH\s+2\s+S\b/g, "H_2S")
    .replace(/\bH\s*_+\s*2\s*_+\s*S\b/g, "H_2S");
}
