"use client";

import { motion } from "framer-motion";
import type { ClauseRisk } from "@/lib/api";

const RISK_LABEL: Record<string, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
};

export default function ClauseRow({ clause, index }: { clause: ClauseRisk; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="py-8 border-b hairline"
    >
      <div className="flex items-start justify-between gap-6 mb-3">
        <h3 className="font-display text-xl md:text-2xl leading-snug">{clause.clause_type}</h3>
        <div className="flex items-center gap-3 shrink-0 pt-1">
          {clause.page_number && (
            <span className="label-ui text-[9px] text-slate border hairline px-2.5 py-1">
              Pg. {clause.page_number}
            </span>
          )}
          <span className="label-ui text-[9px]">{RISK_LABEL[clause.risk_level]}</span>
        </div>
      </div>

      {clause.excerpt && (
        <p className="font-body italic text-[17px] text-slate leading-relaxed mb-3 border-l hairline pl-5" style={{ borderLeftWidth: "1.5px" }}>
          "{clause.excerpt}"
        </p>
      )}

      <p className="font-body text-[17px] leading-relaxed mb-3">{clause.explanation}</p>

      <p className="label-ui text-[10px] text-slate mb-1">Recommendation</p>
      <p className="font-body text-[16px] leading-relaxed text-ink/80">{clause.recommendation}</p>
    </motion.div>
  );
}
