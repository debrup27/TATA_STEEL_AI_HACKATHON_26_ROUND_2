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

/** $FeCl$ with subscript digits outside the math delimiters. */
const SPLIT_MATH_SUB = /\$([^$\n]+)\$\s*_?(\d{1,2})\b/g;

/** Un-glue markdown table rows compacted onto one line (common LLM / API flattening). */
export function repairCollapsedMarkdownTables(text: string): string {
  if (!text || !text.includes("|")) return text;
  let out = text;
  // "| cell ||---|" or "| cell || next row |"
  out = out.replace(/\|\s*\|(?=-)/g, "|\n|");
  out = out.replace(/\|\s*\|(?=\|)/g, "|\n|");
  // "|---|---|| SRF |" — a doubled pipe glued onto the next row's first cell value.
  out = out.replace(/\|\s*\|(?=\s*[A-Za-z0-9])/g, "|\n|");
  // "events | |---" missing newline before separator
  out = out.replace(/\|\s+\|(-{3,})/g, "|\n|$1");
  return out;
}

/** Full pipeline for MANAS assistant text (chemistry, ISO codes, broken LLM markup). */
export function normalizeTechnicalMarkdown(text: string): string {
  if (!text) return text;
  // Conservative: unicode super/subscripts (H₂S, FeCl₃, Nm³, 10⁶, β₁₀) already render
  // perfectly as plain text — converting them to KaTeX makes them italic, detached and
  // worse. We only touch what renders BADLY raw: ASCII carets/underscores, content the
  // model already put in $...$, and finishing-stand ranges. Everything else stays plain.
  let t = text;
  t = repairSplitChemistryMath(t);      // fixes $FeCl$_2 / $FeCl$₂ glued onto math
  t = repairFinishingStandNotation(t);  // $F^1$ → $F_{1}$ (and F¹ stand label)
  t = mergeSplitMathSubscripts(t);
  const mapped = mapOutsideProtected(t, (segment) => {
    let s = segment;
    s = repairStandRangeNotation(s);    // F1–F7 → $F_{1}$–$F_{7}$
    s = wrapScientificExpressions(s);   // ASCII x^2, m/s^2, 10^6, β_10, H_2 etc.
    s = normalizeTechnicalSegment(s);   // bracket fixes, ISO underscore escapes
    return s;
  });
  return collapseDoubledInlineMath(mapped);
}

/** A later wrapping pass can re-wrap `$X$` → `$$X$$`, which KaTeX renders as a
 *  centered display block mid-sentence. Collapse such single-token doubles back
 *  to inline. Real display equations contain spaces/operators and are untouched. */
function collapseDoubledInlineMath(s: string): string {
  return s.replace(/\$\$([A-Za-z0-9_^{}\\+\-.]+)\$\$/g, (_, inner: string) => `$${inner}$`);
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

/** β₁₀(c) ≥ 200, β_10(c), 10^6, x^2 — scientific / filtration notation. */
function wrapScientificExpressions(s: string): string {
  let out = s;

  // Unicode greek subscripts (β₁₀(c)) render fine as plain text — not converted.
  // Only ASCII underscore forms (β_10(c)) and carets are wrapped below.
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
    /\b(\d+(?:\.\d+)?)\^(\{?[0-9+\-]+\}?)/g,
    (full, base: string, exp: string) =>
      full.includes("$") ? full : `$${base}^{${exp.replace(/[{}]/g, "")}}$`,
  );

  // Caret superscript on letters / units: x^2, m/s^2, cm^3, e^x. F^n is a
  // finishing-stand label → subscript, not superscript.
  out = out.replace(
    /([A-Za-zμ]{1,4})\^(\{?[0-9a-zA-Z+\-]+\}?)/g,
    (full, base: string, exp: string) => {
      if (full.includes("$")) return full;
      const e = exp.replace(/[{}]/g, "");
      if (base === "F" && /^\d+$/.test(e)) return `$F_{${e}}$`;
      const latexBase = base === "μ" ? "\\mu" : base;
      return `$${latexBase}^{${e}}$`;
    },
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
  out = out
    .replace(/\bF\^\{?(\d)\}?/g, "F_{$1}")
    .replace(/\bF\s*-\s*F(?:_\{?(\d)\}?)?/gi, (_, end?: string) =>
      end ? `F_{1} - F_{${end}}` : "F_{1} - F_{7}",
    )
    .replace(/((?:[A-Z][a-z]?)+)_(\d+)([A-Za-z]{0,4})/g, "$1_{$2}$3")
    .replace(/((?:[A-Z][a-z]?)+)(\d{1,2})(?![0-9a-zA-Z_])/g, "$1_{$2}")
    .replace(/(\\[a-z]+)_(\d+)/g, "$1_{$2}");
  return out;
}

/** LLM often emits F^1 / F^7 (superscript) for finishing stands — should be subscripts. */
function repairFinishingStandNotation(s: string): string {
  let out = s;
  // F¹ F⁷ unicode superscripts on stand letter
  out = out.replace(/\bF([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\b/g, (_, sup: string) => {
    const d = unicodeSupDigits(sup);
    return d ? `$F_{${d}}$` : `F${sup}`;
  });
  // $F^1$ $F^{7}$ inline math with caret superscripts
  out = out.replace(/\$F\^\{?(\d)\}?\$/g, (_, d: string) => `$F_{${d}}$`);
  // $F^1 - F^7$ or $F^1 through F^7$ inside one math span
  out = out.replace(
    /\$([^$]*F\^[\d{}]+[^$]*)\$/g,
    (full, inner: string) => `$${fixMathBody(inner)}$`,
  );
  return out;
}

function normalizeTechnicalSegment(segment: string): string {
  let s = segment;
  // Unicode subscript formulas (FeCl₂, H₂S) are left as-is — they render fine plain.
  s = normalizeUnicodeSubscripts(s);   // flatten orphan digit subs (17945₂ → 179452)
  s = fixBrokenChemBrackets(s);        // [H_2S → (H_2S)
  s = fixSpacedChemTokens(s);
  s = escapeTechnicalUnderscores(s);   // ISO_15156 → ISO\_15156
  s = wrapBareChemicalFormulas(s);     // ASCII underscore forms only (H_2S, FeCl_2)
  return s;
}

function repairStandRangeNotation(s: string): string {
  let out = s;
  out = out.replace(
    /\bF([₀₁₂₃₄₅₆₇₈₉]|\d)[\s–-]+F([₀₁₂₃₄₅₆₇₈₉]|\d)\b/gi,
    (_, a: string, b: string) => {
      const d1 = UNICODE_SUBSCRIPTS.includes(a) ? unicodeSubDigits(a) : a;
      const d2 = UNICODE_SUBSCRIPTS.includes(b) ? unicodeSubDigits(b) : b;
      return `$F_{${d1}}$–$F_{${d2}}$`;
    },
  );
  out = out.replace(
    /\$F\s*[-–]\s*F(?:_\{?(\d)\}?)?\$/gi,
    (_, end?: string) => (end ? `$F_{1}$–$F_{${end}}$` : `$F_{1}$–$F_{7}$`),
  );
  out = out.replace(
    /\$F\^(\d)\s*[-–]\s*F\^(\d)\$/g,
    (_, a: string, b: string) => `$F_{${a}}$–$F_{${b}}$`,
  );
  return out;
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
    // Standard codes: ISO_15156, NACE_MR0175 — underscore group must contain a
    // letter or be 3+ digits, so chemical subscripts (CO_2, SO_3) are left alone.
    .replace(
      /\b([A-Z]{2,}(?:_(?:[A-Z0-9]*[A-Z][A-Z0-9]*|\d{3,}))+)\b/g,
      (m) => m.replace(/_/g, "\\_"),
    )
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
  // NOTE: no bare-digit rule. "FeCl2", "Nm3", "F1", "10m3" are ambiguous (units,
  // factory labels, plain numbers) and were rendering as stray italic subscripts.
  // Only explicit underscore/brace forms (the model's intent) become math.
  return out;
}

/** `[H S` / `H 2 S` fragments left after emphasis breaks. */
function fixSpacedChemTokens(s: string): string {
  return s
    .replace(/\[\s*H\s+S\b/g, "H_2S")
    .replace(/\bH\s+2\s+S\b/g, "H_2S")
    .replace(/\bH\s*_+\s*2\s*_+\s*S\b/g, "H_2S");
}
