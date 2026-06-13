/* ─── Framer Motion Spring Presets ─── */

export const SPRING_DEFAULT = { stiffness: 380, damping: 30 } as const;

export const SPRING_SOFT = { stiffness: 140, damping: 22 } as const;

export const SPRING_MEDIUM = { stiffness: 300, damping: 20 } as const;

export const SPRING_STIFF = { stiffness: 220, damping: 26 } as const;

export const SPRING_NAV = { damping: 25, stiffness: 200 } as const;

/* ─── Framer Motion Duration Presets ─── */

export const DURATION_FAST = 0.15;
export const DURATION = 0.2;
export const DURATION_MEDIUM = 0.25;
export const DURATION_SLOW = 0.35;
export const DURATION_VERY_SLOW = 0.55;
export const DURATION_SECTION_FADE = 0.4;

/* ─── Chat Simulation Defaults ─── */

export const CHAT_SIM_STEP_INTERVAL = 1500;
export const CHAT_SIM_OVERRIDE_STEP_INTERVAL = 1200;
export const CHAT_SIM_STEP_COUNT = 3;
export const CHAT_SIM_PROCESSING_DELAY = 600;
export const CHAT_SIM_EXTRA_DONE_DELAY = 500;
export const CHAT_SIM_OVERRIDE_EXTRA_DONE_DELAY = 400;

/* ─── Telemetry Defaults ─── */

export const TELEMETRY_CELL_INTERVAL = 2000;
export const TELEMETRY_HUB_INTERVAL = 3500;

/* ─── UI Feedback Durations ─── */

export const TOAST_DURATION = 3150;
export const COPY_FEEDBACK_DURATION = 2000;
export const SEARCH_DEBOUNCE_MS = 500;
export const SESSION_SAVE_DEBOUNCE_MS = 500;
export const TOAST_CLEAR_TIMEOUT = 100;

/* ─── Layout / Scroll ─── */

export const SCROLL_THRESHOLD = 100;
export const TEXTAREA_MAX_ROWS = 10;
export const TEXTAREA_MAX_LENGTH = 2000;

/* ─── Page Transition ─── */

export const WASH_DURATION = 1300;
export const TRANSITION_BLOB_DURATION = 0.7;
export const TRANSITION_SETTLE_DELAY = 80;
export const TRANSITION_ROUTER_DELAY = 700;
