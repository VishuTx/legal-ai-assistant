/**
 * API client for the Legal AI backend.
 * All functions throw on non-2xx responses — callers should try/catch.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types — mirror the backend Pydantic schemas ───────────────────

export interface DocumentOut {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: "processing" | "ready" | "error";
  page_count: number;
  chunk_count: number;
  upload_at: string;
}

export interface ClauseRisk {
  clause_type: string;
  excerpt: string;
  risk_level: "high" | "medium" | "low";
  explanation: string;
  page_number: number | null;
  recommendation: string;
}

export interface ContractSummary {
  contract_type: string;
  parties: string[];
  effective_date: string | null;
  term_duration: string | null;
  governing_law: string | null;
  key_obligations: string[];
  overall_risk: "high" | "medium" | "low";
  risk_score: number;
  flagged_clauses: ClauseRisk[];
  missing_standard_clauses: string[];
  executive_summary: string;
}

export interface RedlineItem {
  clause_type: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  priority: "must-have" | "recommended" | "optional";
}

export interface RedlineReport {
  total_redlines: number;
  must_have_changes: number;
  redlines: RedlineItem[];
  negotiation_summary: string;
}

export interface AnalysisResponse {
  analysis_id: string;
  document_id: string;
  analysis_type: string;
  model_used: string;
  tokens_used: number;
  result: ContractSummary | RedlineReport;
  cached?: boolean;
}

export interface ChatSource {
  text: string;
  page_number: number;
  score: number;
}

export interface ChatMessageOut {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: ChatSource[] | null;
  created_at: string;
}

export interface ChatSessionOut {
  id: string;
  document_id: string;
  created_at: string;
  messages: ChatMessageOut[];
}

export interface ChatResponse {
  message_id: string;
  answer: string;
  sources: ChatSource[];
  session_id: string;
}

// ── Helper ──────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response had no JSON body
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Documents ──────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<DocumentOut> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = "Upload failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  return res.json();
}

export function listDocuments(): Promise<DocumentOut[]> {
  return request("/api/documents/");
}

export function getDocument(id: string): Promise<DocumentOut> {
  return request(`/api/documents/${id}`);
}

export function deleteDocument(id: string): Promise<void> {
  return request(`/api/documents/${id}`, { method: "DELETE" });
}

// ── Analysis ───────────────────────────────────────────────────

export function analyseDocument(
  documentId: string,
  analysisType: "full" | "risk" | "redline" | "summary" = "full",
  playbookContext?: string
): Promise<AnalysisResponse> {
  return request("/api/analysis/analyse", {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      analysis_type: analysisType,
      playbook_context: playbookContext || null,
    }),
  });
}

export function getAnalysisHistory(documentId: string): Promise<AnalysisResponse[]> {
  return request(`/api/analysis/history/${documentId}`);
}

// ── Chat ───────────────────────────────────────────────────────

export function createChatSession(documentId: string): Promise<ChatSessionOut> {
  return request(`/api/chat/session/${documentId}`, { method: "POST" });
}

export function getChatSession(sessionId: string): Promise<ChatSessionOut> {
  return request(`/api/chat/session/${sessionId}`);
}

export function askQuestion(sessionId: string, message: string): Promise<ChatResponse> {
  return request("/api/chat/ask", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}
