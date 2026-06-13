"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface UseMockChatSimulationOptions {
  stepInterval?: number;
  stepCount?: number;
  processingDelay?: number;
  extraDoneDelay?: number;
  onDone?: () => void;
}

export function useMockChatSimulation(options: UseMockChatSimulationOptions = {}) {
  const {
    stepInterval = 1500,
    stepCount = 3,
    processingDelay = 600,
    extraDoneDelay = 500,
    onDone,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const start = useCallback(() => {
    setIsLoading(true);
    setCurrentStep(0);
    setShowProcessing(false);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setShowProcessing(false);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setShowProcessing(true);
    }, processingDelay);
    return () => clearTimeout(timer);
  }, [isLoading, processingDelay]);

  useEffect(() => {
    if (!showProcessing) return;

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= stepCount - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, stepInterval);

    const doneTimer = setTimeout(() => {
      setIsLoading(false);
      setShowProcessing(false);
      setCurrentStep(0);
      onDoneRef.current?.();
    }, stepInterval * stepCount + extraDoneDelay);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(doneTimer);
    };
  }, [showProcessing, stepInterval, stepCount, extraDoneDelay]);

  return { isLoading, showProcessing, currentStep, start, reset };
}
