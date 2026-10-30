"use client";

import { useEffect } from "react";
import { OPTION_LETTERS } from "./answer-status";

const DIGITS = ["1", "2", "3", "4", "5", "6"];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[role=dialog], [role=alertdialog]")) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  return tag === "INPUT" && (target as HTMLInputElement).type !== "radio";
}

/** Tekan A–E atau 1–5 untuk memilih jawaban tanpa mouse. */
export function useOptionShortcuts(enabled: boolean, optionCount: number, onPick: (index: number) => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      let index = OPTION_LETTERS.indexOf(event.key.toUpperCase() as (typeof OPTION_LETTERS)[number]);
      if (index === -1) index = DIGITS.indexOf(event.key);
      if (index === -1 || index >= optionCount) return;
      event.preventDefault();
      onPick(index);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, optionCount, onPick]);
}
