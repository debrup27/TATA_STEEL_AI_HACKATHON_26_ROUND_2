"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  fetchBackendStatus,
  shouldSkipStartupSplash,
  storeBootId,
} from "@/lib/backend-ready";
import { deferEffect } from "@/lib/defer-effect";

const DOT_SEQ = [1, 2, 3, 2] as const;
const BACKEND_POLL_MS = 10_000;
const DOT_STEP_MS = 450;

function useAnimatedDots() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % DOT_SEQ.length);
    }, DOT_STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  return ".".repeat(DOT_SEQ[idx]);
}

function useRetryCountdown(active: boolean, intervalMs: number) {
  const [secondsLeft, setSecondsLeft] = useState(intervalMs / 1000);

  useEffect(() => {
    if (!active) return;
    deferEffect(() => {
      setSecondsLeft(intervalMs / 1000);
    });
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? intervalMs / 1000 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return secondsLeft;
}

function BackendStartupSplash({
  attempt,
  secondsLeft,
}: {
  attempt: number;
  secondsLeft: number;
}) {
  const dots = useAnimatedDots();

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#faf9f5]">
      <div className="px-6 text-center">
        <Image
          src="/long_form_logo.webp"
          alt="atal"
          width={280}
          height={80}
          className="mx-auto mb-8 h-auto w-[min(280px,72vw)] -translate-x-3"
          priority
        />
        <p
          className="mt-2 translate-x-2.5 text-2xl font-bold uppercase tracking-tight text-[#1b253c]"
          style={{ fontFamily: "var(--font-pixeloid)" }}
        >
          atal
          <span className="ml-3 inline-block min-w-[1.75em] text-left">{dots}</span>
        </p>
        <p
          className="mt-5 text-[0.95rem] text-zinc-500"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          Please wait while the backend loads.
        </p>
        <p
          className="mt-2 min-h-[1.25rem] text-[0.85rem] text-zinc-400"
          style={{ fontFamily: "var(--font-questrial)" }}
        >
          {attempt === 0
            ? "Checking backend…"
            : `Backend not ready — retrying in ${secondsLeft}s… (attempt ${attempt})`}
        </p>
      </div>
    </div>
  );
}

type GatePhase = "checking" | "splash" | "app";

export default function BackendReadyGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<GatePhase>("checking");
  const [attempt, setAttempt] = useState(0);
  const polling = phase === "splash";
  const secondsLeft = useRetryCountdown(polling, BACKEND_POLL_MS);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const finishReady = (bootId?: string) => {
      if (bootId) storeBootId(bootId);
      if (!cancelled) setPhase("app");
    };

    const poll = async () => {
      setAttempt((n) => n + 1);
      const status = await fetchBackendStatus();
      if (cancelled) return false;
      if (status.ready) {
        finishReady(status.bootId);
        return true;
      }
      setPhase("splash");
      return false;
    };

    void (async () => {
      const status = await fetchBackendStatus();
      if (cancelled) return;

      if (status.ready && shouldSkipStartupSplash(status.bootId)) {
        finishReady(status.bootId);
        return;
      }

      if (status.ready) {
        finishReady(status.bootId);
        return;
      }

      setPhase("splash");
      if (await poll()) return;

      intervalId = setInterval(() => {
        void poll().then((ready) => {
          if (ready && intervalId) clearInterval(intervalId);
        });
      }, BACKEND_POLL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (phase === "checking") {
    return <div className="min-h-screen bg-[#faf9f5]" />;
  }

  if (phase === "splash") {
    return <BackendStartupSplash attempt={attempt} secondsLeft={secondsLeft} />;
  }

  return <>{children}</>;
}
