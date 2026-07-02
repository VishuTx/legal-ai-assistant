"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { ChatMessageOut } from "@/lib/api";

/**
 * Simulated streaming reveal — backend currently returns the full answer
 * at once (not SSE), so we reveal it word-by-word client-side for the
 * "live answer" feel described in the brief. Swap this for true token
 * streaming once the backend exposes an SSE endpoint.
 */
function useTypewriter(text: string, active: boolean, speed = 18) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(active && !reduced ? "" : text);

  useEffect(() => {
    if (!active || reduced) {
      setShown(text);
      return;
    }
    const words = text.split(" ");
    let i = 0;
    setShown("");
    const interval = setInterval(() => {
      i++;
      setShown(words.slice(0, i).join(" "));
      if (i >= words.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, reduced, speed]);

  return shown;
}

export default function ChatMessage({
  message,
  animate = false,
}: {
  message: ChatMessageOut;
  animate?: boolean;
}) {
  const isUser = message.role === "user";
  const displayedText = useTypewriter(message.content, animate && !isUser);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="label-ui text-[10px] text-slate mb-3">Question</p>
        <p className="font-display text-2xl md:text-3xl leading-snug">{message.content}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-16 pb-10 border-b hairline"
    >
      <p className="label-ui text-[10px] text-slate mb-3">Answer</p>
      <p className="font-body italic text-xl md:text-2xl leading-relaxed mb-6">
        {displayedText}
        {animate && displayedText.length < message.content.length && (
          <span className="inline-block w-[2px] h-5 bg-ink ml-1 animate-pulse" />
        )}
      </p>

      {message.sources && message.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.sources.map((source, i) => (
            <span
              key={i}
              className="label-ui text-[9px] text-slate border hairline px-3 py-1.5"
              title={source.text}
            >
              Pg. {source.page_number} · {(source.score * 100).toFixed(0)}% match
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
