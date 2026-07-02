"use client";

import CountUp from "./count-up";

const RISK_COLORS: Record<string, string> = {
  high: "border-ink",
  medium: "border-slate",
  low: "border-hairline",
};

export default function RiskScore({
  score,
  level,
  size = "large",
}: {
  score: number;
  level: "high" | "medium" | "low";
  size?: "large" | "small";
}) {
  if (size === "small") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl">{score.toFixed(1)}</span>
        <span className="label-ui text-[9px] text-slate">/ 10</span>
      </div>
    );
  }

  return (
    <div className={`border-l pl-8 ${RISK_COLORS[level] || "border-hairline"}`} style={{ borderLeftWidth: "1.5px" }}>
      <div className="flex items-baseline gap-3">
        <CountUp value={score} decimals={1} className="font-display text-[clamp(64px,9vw,120px)] leading-none tracking-tight" />
        <span className="font-display text-2xl text-slate">/ 10</span>
      </div>
      <p className="label-ui text-[10px] text-slate mt-4">Risk Index</p>
      <p className="label-ui text-[10px] mt-1">
        Overall — <span className="italic font-body normal-case tracking-normal text-base">{level}</span>
      </p>
    </div>
  );
}
