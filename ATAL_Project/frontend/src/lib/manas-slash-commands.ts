export interface ManasSlashCommand {
  name: string;
  label: string;
  description: string;
  hint: string;
  /** Keep the textarea open so the user can supply a draft (e.g. prompt optimizer). */
  requiresInput?: boolean;
}

export const MANAS_SLASH_COMMANDS: ManasSlashCommand[] = [
  {
    name: "prompt-optimizer",
    label: "/prompt-optimizer",
    description: "Sharpen your draft into a focused MANAS maintenance question.",
    hint: "Steel-plant diagnostics · RAG docs · asset telemetry — not code generation",
    requiresInput: true,
  },
  {
    name: "compact",
    label: "/compact",
    description: "Summarise older chat messages into a context summary.",
    hint: "Manual from 3 msgs · auto at 7 · keeps last 2 / 6",
  },
  {
    name: "sansad",
    label: "/sansad",
    description: "Link live SANSAD plant context to this chat.",
    hint: "0.8b harvest · refreshed every 5 messages",
  },
  {
    name: "deactivate",
    label: "/deactivate",
    description: "Exit SANSAD context mode and clear the briefing.",
    hint: "Removes persistent plant summary",
  },
  {
    name: "update",
    label: "/update",
    description: "Re-fetch live plant data and replace the SANSAD briefing.",
    hint: "SANSAD mode only · fresh 0.8b harvest",
  },
];

const SANSAD_MODE_ONLY = new Set(["deactivate", "update"]);

/** Commands shown in the slash menu for the current session mode. */
export function visibleSlashCommands(sansadModeActive = false): ManasSlashCommand[] {
  return MANAS_SLASH_COMMANDS.filter((cmd) => {
    if (!sansadModeActive && SANSAD_MODE_ONLY.has(cmd.name)) return false;
    if (sansadModeActive && cmd.name === "sansad") return false;
    return true;
  });
}

/** Returns the filter string after `/`, or null if not in slash-command mode. */
export function getSlashFilter(prompt: string): string | null {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith("/")) return null;
  const rest = trimmed.slice(1);
  if (rest.includes(" ") || rest.includes("\n")) return null;
  return rest.toLowerCase();
}

export function filterSlashCommands(filter: string, sansadModeActive = false): ManasSlashCommand[] {
  const pool = visibleSlashCommands(sansadModeActive);
  if (!filter) return pool;
  return pool.filter(
    (cmd) => cmd.name.startsWith(filter) || cmd.label.slice(1).startsWith(filter),
  );
}

export function resolveSlashCommand(prompt: string): ManasSlashCommand | null {
  const normalized = prompt.trim().toLowerCase();
  return MANAS_SLASH_COMMANDS.find((cmd) => normalized === cmd.label) ?? null;
}

/** Match a slash command with optional trailing draft text. */
export function parseSlashCommandInput(
  prompt: string,
): { cmd: ManasSlashCommand; args: string } | null {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  for (const cmd of MANAS_SLASH_COMMANDS) {
    const label = cmd.label.toLowerCase();
    if (lower === label) return { cmd, args: "" };
    if (lower.startsWith(`${label} `)) {
      return { cmd, args: trimmed.slice(cmd.label.length).trim() };
    }
  }
  return null;
}

export function isSlashCommandInput(prompt: string): boolean {
  return resolveSlashCommand(prompt) !== null;
}
