export default function StatusTag({ status }: { status: "processing" | "ready" | "error" }) {
  const labels: Record<string, string> = {
    processing: "Processing",
    ready: "Ready",
    error: "Failed",
  };

  return (
    <span className="label-ui text-[10px] inline-flex items-center gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "ready"
            ? "bg-ink"
            : status === "processing"
            ? "bg-slate animate-pulse"
            : "bg-ink"
        }`}
        style={status === "error" ? { backgroundColor: "#0A0A0A" } : undefined}
      />
      {labels[status]}
    </span>
  );
}
