"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import Navbar from "@/components/navbar";
import Reveal from "@/components/reveal";
import RiskScore from "@/components/risk-score";
import ClauseRow from "@/components/clause-row";
import RedlineRow from "@/components/redline-row";
import StatusTag from "@/components/status-tag";
import {
  getDocument,
  analyseDocument,
  type DocumentOut,
  type ContractSummary,
  type RedlineReport,
} from "@/lib/api";

type AnalysisTab = "full" | "redline";

export default function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [doc, setDoc] = useState<DocumentOut | null>(null);
  const [tab, setTab] = useState<AnalysisTab>("full");
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [redline, setRedline] = useState<RedlineReport | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    try {
      const d = await getDocument(id);
      setDoc(d);
    } catch {
      setError("Document not found.");
    } finally {
      setLoadingDoc(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const runAnalysis = useCallback(
    async (type: AnalysisTab) => {
      setLoadingAnalysis(true);
      setError(null);
      try {
        const res = await analyseDocument(id, type);
        if (type === "full") {
          setSummary(res.result as ContractSummary);
        } else {
          setRedline(res.result as RedlineReport);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed! Please Try Again.");
      } finally {
        setLoadingAnalysis(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!doc || doc.status !== "ready") return;
    if (tab === "full" && !summary) runAnalysis("full");
    if (tab === "redline" && !redline) runAnalysis("redline");
  }, [doc, tab, summary, redline, runAnalysis]);

  if (loadingDoc) {
    return (
      <>
        <Navbar />
        <div className="pt-44 px-6 text-center font-body italic text-slate">Loading document…</div>
      </>
    );
  }

  if (!doc) {
    return (
      <>
        <Navbar />
        <div className="pt-44 px-6 text-center font-body italic text-slate">{error || "Document not found."}</div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <section className="pt-36 px-6 md:px-10 max-w-[1440px] mx-auto">
        <Reveal>
          <Link
            href="/"
            className="label-ui text-[10px] text-slate hover:text-ink transition-colors inline-flex items-center gap-2 mb-8"
          >
            <ArrowLeft size={13} strokeWidth={1.5} /> Back to Library
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b hairline pb-8 mb-12">
            <div>
              <p className="label-ui text-[10px] text-slate mb-3">Dossier</p>
              <h1 className="font-display text-4xl md:text-6xl leading-[0.98] max-w-3xl">
                {doc.original_name}
              </h1>
              <div className="flex items-center gap-5 mt-5">
                <StatusTag status={doc.status} />
                <span className="label-ui text-[10px] text-slate">
                  {doc.page_count} pages · {doc.chunk_count} segments
                </span>
              </div>
            </div>

            <Link
              href={`/documents/${doc.id}/chat`}
              className="label-ui text-[11px] border hairline px-6 py-3.5 hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-300 inline-flex items-center gap-2 shrink-0"
            >
              <MessageSquare size={14} strokeWidth={1.5} />
              Ask Questions
            </Link>
          </div>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.1}>
          <div className="flex gap-8 mb-12">
            <button
              onClick={() => setTab("full")}
              className={`label-ui text-[11px] pb-3 border-b transition-colors ${
                tab === "full" ? "border-ink" : "border-transparent text-slate"
              }`}
              style={{ borderBottomWidth: "1.5px" }}
            >
              Risk Analysis
            </button>
            <button
              onClick={() => setTab("redline")}
              className={`label-ui text-[11px] pb-3 border-b transition-colors ${
                tab === "redline" ? "border-ink" : "border-transparent text-slate"
              }`}
              style={{ borderBottomWidth: "1.5px" }}
            >
              Redline
            </button>
          </div>
        </Reveal>

        {loadingAnalysis && (
          <div className="flex items-center gap-3 py-20 justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={18} strokeWidth={1.3} className="text-slate" />
            </motion.div>
            <p className="label-ui text-[11px] text-slate">
              {tab === "full" ? "Analysing contract…" : "Generating redlines…"}
            </p>
          </div>
        )}

        {error && !loadingAnalysis && (
          <div className="py-12 text-center">
            <p className="font-body italic text-slate mb-4">{error}</p>
            <button
              onClick={() => runAnalysis(tab)}
              className="label-ui text-[10px] border hairline px-5 py-2.5 hover:bg-ink hover:text-paper transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Full analysis view */}
        {tab === "full" && summary && !loadingAnalysis && (
          <div className="grid md:grid-cols-12 gap-12 pb-32">
            <div className="md:col-span-7">
              <Reveal>
                <p className="label-ui text-[10px] text-slate mb-4">Executive Summary</p>
                <p className="font-body italic text-2xl leading-relaxed mb-12">
                  {summary.executive_summary}
                </p>
              </Reveal>

              <Reveal delay={0.05}>
                <div className="grid grid-cols-2 gap-8 mb-12 pb-12 border-b hairline">
                  <div>
                    <p className="label-ui text-[10px] text-slate mb-3">Contract Type</p>
                    <p className="font-display text-xl">{summary.contract_type}</p>
                  </div>
                  <div>
                    <p className="label-ui text-[10px] text-slate mb-3">Governing Law</p>
                    <p className="font-display text-xl">{summary.governing_law || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="label-ui text-[10px] text-slate mb-3">Effective Date</p>
                    <p className="font-display text-xl">{summary.effective_date || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="label-ui text-[10px] text-slate mb-3">Term</p>
                    <p className="font-display text-xl">{summary.term_duration || "Not specified"}</p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="label-ui text-[10px] text-slate mb-4">Parties</p>
                <p className="font-body text-xl leading-relaxed mb-12">{summary.parties.join(" · ")}</p>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="label-ui text-[10px] text-slate mb-4">Key Obligations</p>
                <ul className="space-y-3 mb-12">
                  {summary.key_obligations.map((ob, i) => (
                    <li key={i} className="font-body text-[17px] leading-relaxed flex gap-3">
                      <span className="text-slate">—</span> {ob}
                    </li>
                  ))}
                </ul>
              </Reveal>

              {summary.missing_standard_clauses.length > 0 && (
                <Reveal delay={0.1}>
                  <p className="label-ui text-[10px] text-slate mb-4">Missing Standard Clauses</p>
                  <ul className="space-y-3">
                    {summary.missing_standard_clauses.map((c, i) => (
                      <li key={i} className="font-body italic text-[17px] text-slate">
                        {c}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>

            <div className="md:col-span-5">
              <Reveal delay={0.15}>
                <RiskScore score={summary.risk_score} level={summary.overall_risk} />
              </Reveal>

              <div className="mt-16">
                <p className="label-ui text-[10px] text-slate mb-2 pb-4 border-b hairline">
                  Flagged Clauses — {summary.flagged_clauses.length}
                </p>
                {summary.flagged_clauses.map((clause, i) => (
                  <ClauseRow key={i} clause={clause} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Redline view */}
        {tab === "redline" && redline && !loadingAnalysis && (
          <div className="pb-32">
            <Reveal>
              <div className="grid grid-cols-2 gap-8 mb-12 pb-12 border-b hairline">
                <div>
                  <p className="label-ui text-[10px] text-slate mb-3">Total Redlines</p>
                  <p className="font-display text-5xl">{redline.total_redlines}</p>
                </div>
                <div>
                  <p className="label-ui text-[10px] text-slate mb-3">Must-Have Changes</p>
                  <p className="font-display text-5xl">{redline.must_have_changes}</p>
                </div>
              </div>
              <p className="font-body italic text-xl leading-relaxed mb-12 max-w-3xl">
                {redline.negotiation_summary}
              </p>
            </Reveal>

            {redline.redlines.map((r, i) => (
              <RedlineRow key={i} redline={r} index={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
