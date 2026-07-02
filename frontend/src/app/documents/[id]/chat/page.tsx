"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUp } from "lucide-react";
import Navbar from "@/components/navbar";
import Reveal from "@/components/reveal";
import ChatMessage from "@/components/chat-message";
import {
  getDocument,
  createChatSession,
  askQuestion,
  type DocumentOut,
  type ChatMessageOut,
} from "@/lib/api";

const SUGGESTED_QUESTIONS = [
  "What are the termination clauses?",
  "Summarise the indemnification terms",
  "What is the governing law?",
  "Are there any liability caps?",
];

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [doc, setDoc] = useState<DocumentOut | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getDocument(id);
        setDoc(d);
        const session = await createChatSession(id);
        setSessionId(session.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start consultation.");
      }
    })();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (question: string) => {
      if (!sessionId || !question.trim() || asking) return;
      setError(null);
      setAsking(true);
      setInput("");

      const userMsg: ChatMessageOut = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: question,
        sources: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await askQuestion(sessionId, question);
        const assistantMsg: ChatMessageOut = {
          id: res.message_id,
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setLastAnsweredId(res.message_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not get an answer. Please retry.");
      } finally {
        setAsking(false);
      }
    },
    [sessionId, asking]
  );

  return (
    <>
      <Navbar />

      <section className="pt-36 px-6 md:px-10 max-w-[900px] mx-auto pb-40 min-h-screen">
        <Reveal>
          <Link
            href={`/documents/${id}`}
            className="label-ui text-[10px] text-slate hover:text-ink transition-colors inline-flex items-center gap-2 mb-8"
          >
            <ArrowLeft size={13} strokeWidth={1.5} /> Back to Dossier
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <p className="label-ui text-[10px] text-slate mb-3">Consultation</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[0.98] mb-3">
            {doc ? doc.original_name : "Loading…"}
          </h1>
          <p className="font-body italic text-lg text-slate mb-16">
            Ask anything about this document. Every answer is grounded in the text, cited by page.
          </p>
        </Reveal>

        {messages.length === 0 && !asking && (
          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-16">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left border hairline px-5 py-4 hover:bg-paper-dim transition-colors duration-300"
                >
                  <p className="font-body italic text-[16px]">{q}</p>
                </button>
              ))}
            </div>
          </Reveal>
        )}

        <div>
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} animate={m.id === lastAnsweredId} />
          ))}
        </div>

        {asking && (
          <div className="flex items-center gap-3 py-6">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="label-ui text-[11px] text-slate"
            >
              Searching the document…
            </motion.span>
          </div>
        )}

        {error && (
          <p className="font-body italic text-slate py-4">{error}</p>
        )}

        <div ref={bottomRef} />
      </section>

      {/* Fixed input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper/95 backdrop-blur-md border-t hairline z-40">
        <div className="max-w-[900px] mx-auto px-6 md:px-10 py-5 flex items-end gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask a question about this contract…"
            rows={1}
            disabled={!sessionId || asking}
            className="flex-1 resize-none bg-transparent font-body text-lg italic placeholder:text-slate placeholder:not-italic placeholder:opacity-60 focus:outline-none py-2"
          />
          <button
            onClick={() => send(input)}
            disabled={!sessionId || asking || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-full border hairline flex items-center justify-center hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Send question"
          >
            <ArrowUp size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </>
  );
}
