"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { saveAnswerAction, saveLastQuestionAction, setFlagAction } from "@/server/actions/tryout-actions";
import type { AnswerState, TryoutQuestion } from "@/lib/tryout/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const POSITION_DEBOUNCE_MS = 800;
const TEXT_DEBOUNCE_MS = 500;

function sameAnswer(a: AnswerState | undefined, b: AnswerState | undefined) {
  return (
    (a?.selectedOptionId ?? null) === (b?.selectedOptionId ?? null) &&
    (a?.answerText ?? "") === (b?.answerText ?? "") &&
    Boolean(a?.isFlagged) === Boolean(b?.isFlagged)
  );
}

export function useServerAutosave({
  enabled,
  sessionId,
  questions,
  answers,
  currentIndex,
}: {
  enabled: boolean;
  sessionId: string;
  questions: TryoutQuestion[];
  answers: Record<string, AnswerState>;
  currentIndex: number;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [closed, setClosed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const persisted = useRef<Record<string, AnswerState>>(answers);
  const inFlight = useRef(0);

  const flush = useEffectEvent(async () => {
    const changed = questions.filter(
      (question) => !sameAnswer(answers[question.id], persisted.current[question.id]),
    );
    if (changed.length === 0) return;
    setStatus("saving");
    inFlight.current += 1;
    let failed = false;
    for (const question of changed) {
      const answer = answers[question.id];
      const previous = persisted.current[question.id];
      const onlyFlagChanged =
        (answer?.selectedOptionId ?? null) === (previous?.selectedOptionId ?? null) &&
        (answer?.answerText ?? "") === (previous?.answerText ?? "");
      const result = onlyFlagChanged
        ? await setFlagAction({ sessionId, questionId: question.id, isFlagged: Boolean(answer?.isFlagged) })
        : await saveAnswerAction({
            sessionId,
            questionId: question.id,
            selectedOptionId: answer?.selectedOptionId ?? null,
            answerText: answer?.answerText ?? null,
            isFlagged: Boolean(answer?.isFlagged),
            lastOrderNumber: currentIndex + 1,
          });
      if (result.ok) persisted.current = { ...persisted.current, [question.id]: answer };
      else if (result.code === "finished" || result.code === "expired") {
        setClosed(true);
        break;
      } else failed = true;
    }
    inFlight.current -= 1;
    if (inFlight.current === 0) setStatus(failed ? "error" : "saved");
  });

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => {
      void flush();
    }, TEXT_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [enabled, answers, retryToken]);

  const savePosition = useEffectEvent(() => {
    void saveLastQuestionAction({ sessionId, lastOrderNumber: currentIndex + 1 });
  });
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(savePosition, POSITION_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [enabled, currentIndex]);

  const retry = () => setRetryToken((token) => token + 1);

  return { status, retry, closed };
}
