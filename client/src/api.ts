const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface ReferenceItem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    let code: string | undefined;
    let message = "The request could not be completed.";
    let fields: Record<string, string> | undefined;
    try {
      const body = await response.json();
      code = body?.error?.code;
      message = body?.error?.message ?? message;
      fields = body?.error?.fields;
    } catch {
      // A non-JSON upstream failure still becomes one safe client error.
    }
    throw new ApiError(message, response.status, code, fields);
  }
  return response.json() as Promise<T>;
}

export function getDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  return readJson("/api/development-requesters");
}

export function getCategories(): Promise<ReferenceItem[]> {
  return readJson("/api/categories");
}

export function getRelatedSystems(): Promise<ReferenceItem[]> {
  return readJson("/api/related-systems");
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Ticket {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  requester: DevelopmentRequester;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
}

export type TicketSort = "createdAt" | "updatedAt" | "ticketNumber" | "summary";
export type SortOrder = "asc" | "desc";

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  requestedPriority: RequestedPriority;
  currentStatus: "NEW";
  updatedAt: string;
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  status?: "NEW";
  sort?: TicketSort;
  order?: SortOrder;
  page?: number;
  pageSize?: 5 | 10 | 20 | 50;
}

export interface TicketListResponse {
  items: TicketSummary[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  query: { search: string; sort: TicketSort; order: SortOrder };
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  submissionToken: string;
}

function requesterHeaders(requesterId: number): HeadersInit {
  return { "X-Development-Requester-Id": String(requesterId) };
}

export function createTicket(requesterId: number, input: CreateTicketInput): Promise<{ ticket: Ticket; replayed: boolean }> {
  return readJson("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...requesterHeaders(requesterId) },
    body: JSON.stringify(input),
  });
}

export function listTickets(requesterId: number, params: TicketListParams = {}): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.size ? `?${query.toString()}` : "";
  return readJson(`/api/tickets${suffix}`, { headers: requesterHeaders(requesterId) });
}

export function uploadAttachment(requesterId: number, ticketId: number, file: File): Promise<{ attachment: unknown }> {
  const body = new FormData();
  body.append("file", file);
  return readJson(`/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: requesterHeaders(requesterId),
    body,
  });
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Ask the backend whether it is alive, then read the category list from it.
// Throwing on failure (bad HTTP status OR no connection at all) lets App.tsx show
// one single Offline state instead of handling errors in several places.
export async function checkSystem(): Promise<SystemStatus> {
  const health = await fetch(`${API_URL}/api/health`);
  if (!health.ok) throw new Error(`Health check failed (HTTP ${health.status})`);

  const categoriesResponse = await fetch(`${API_URL}/api/categories`);
  if (!categoriesResponse.ok) {
    throw new Error(`Category list failed (HTTP ${categoriesResponse.status})`);
  }
  const categories: Category[] = await categoriesResponse.json();

  return { online: true, categories };
}
