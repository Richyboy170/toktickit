/**
 * The client talks to the Lab 3 API through an HTTP-only session cookie.
 * `requesterId` remains an optional argument on the Lab 2 helpers solely for
 * the old development selector route; authenticated screens deliberately
 * omit it and therefore never send the Lab 2 identity header.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface ReferenceItem {
  id: number;
  name: string;
}

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
  requiresPasswordChange?: boolean;
}

/** Lab 2's name is retained as a structural alias for the old components. */
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
    this.name = "ApiError";
  }
}

function withSession(init: RequestInit = {}): RequestInit {
  return { credentials: "include", ...init };
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, withSession(init));
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function responseError(response: Response): Promise<ApiError> {
  let code: string | undefined;
  let message = "The request could not be completed.";
  let fields: Record<string, string> | undefined;
  try {
    const body = await response.clone().json() as { error?: { code?: string; message?: string; fields?: Record<string, string> }; message?: string };
    code = body?.error?.code;
    message = body?.error?.message ?? body?.message ?? message;
    fields = body?.error?.fields;
  } catch {
    // A non-JSON upstream failure still becomes one safe client error.
  }
  return new ApiError(message, response.status, code, fields);
}

function asUser(value: unknown): AuthUser | null {
  const body = value as { user?: unknown } | null | undefined;
  const candidate = (body && typeof body === "object" && "user" in body ? body.user : value) as Partial<AuthUser> | null | undefined;
  if (!candidate || typeof candidate !== "object") return null;
  if (!Number.isInteger(candidate.id) || typeof candidate.name !== "string" || typeof candidate.email !== "string") return null;
  const role = candidate.role;
  if (role !== "REQUESTER" && role !== "IT_STAFF" && role !== "ADMINISTRATOR") return null;
  return candidate as AuthUser;
}

export interface LoginResponse {
  user: AuthUser;
  mustChangePassword?: boolean;
  requiresPasswordChange?: boolean;
}

function normalizeLogin(value: unknown): LoginResponse {
  const user = asUser(value);
  if (!user) throw new ApiError("The login response was invalid.", 502, "INVALID_AUTH_RESPONSE");
  const body = value as Partial<LoginResponse>;
  const mustChangePassword = Boolean(body.mustChangePassword ?? body.requiresPasswordChange ?? user.mustChangePassword ?? user.requiresPasswordChange);
  return { user: { ...user, mustChangePassword }, mustChangePassword, requiresPasswordChange: mustChangePassword };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return normalizeLogin(await readJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
}

export async function logout(): Promise<void> {
  await readJson<void>("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return asUser(await readJson("/api/auth/me"));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
  confirmPassword?: string;
}

export async function changePassword(input: ChangePasswordInput | string, maybeNewPassword?: string): Promise<{ user?: AuthUser }> {
  const body: ChangePasswordInput = typeof input === "string"
    ? { currentPassword: input, newPassword: maybeNewPassword ?? "" }
    : input;
  const result = await readJson<unknown>("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const user = asUser(result);
  return user ? { user } : (result as { user?: AuthUser } ?? {});
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
export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role?: UserRole | "IT_STAFF";
  isActive?: boolean;
}

export interface TicketOwner extends StaffUser {}

export interface PublicComment {
  id: number;
  body?: string;
  content?: string;
  author: StaffUser | AuthUser;
  createdAt: string;
}

export interface InternalNote {
  id: number;
  body?: string;
  content?: string;
  author: StaffUser | AuthUser;
  createdAt: string;
}

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
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
  itPriority?: RequestedPriority;
  ticketOwner?: TicketOwner | null;
  assignedTo?: TicketOwner | null;
  owner?: TicketOwner | null;
  requesterResolved?: boolean;
  problemAppearsResolved?: boolean;
  requesterMarkedResolved?: boolean;
  requesterResolutionIndicatedAt?: string | null;
  requesterResolvedAt?: string | null;
}

export interface AttachmentMetadata {
  id: number;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
  removedByRequesterId: number | null;
  available: boolean;
}

export interface TicketDetail extends Ticket {
  attachments: AttachmentMetadata[];
  publicComments?: PublicComment[];
  comments?: PublicComment[];
  internalNotes?: InternalNote[];
  notes?: InternalNote[];
}

export type TicketSort = "createdAt" | "updatedAt" | "ticketNumber" | "summary";
export type StaffTicketSort = TicketSort | "requestedPriority" | "itPriority" | "currentStatus" | "owner";
export type SortOrder = "asc" | "desc";

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  ticketDate: string;
  summary: string;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  updatedAt: string;
  createdAt?: string;
  requester?: DevelopmentRequester | StaffUser;
  itPriority?: RequestedPriority;
  ticketOwner?: TicketOwner | null;
  assignedTo?: TicketOwner | null;
  owner?: TicketOwner | null;
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  status?: TicketStatus;
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

export interface StaffTicketListParams extends Omit<TicketListParams, "sort"> {
  itPriority?: RequestedPriority;
  assignment?: "assigned" | "unassigned";
  ownerId?: number | "unassigned";
  unassigned?: boolean;
  sort?: StaffTicketSort;
}

export interface StaffTicketListResponse {
  items: TicketSummary[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  query?: { search?: string; sort?: StaffTicketSort; order?: SortOrder };
}

export type StaffTicketDetail = TicketDetail;

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  submissionToken: string;
}

function requesterHeaders(requesterId?: number): HeadersInit {
  return requesterId === undefined ? {} : { "X-Development-Requester-Id": String(requesterId) };
}

function queryString(params: object): string {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.size ? `?${query.toString()}` : "";
}

export function createTicket(requesterId: number | undefined, input: CreateTicketInput): Promise<{ ticket: Ticket; replayed: boolean }> {
  return readJson("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...requesterHeaders(requesterId) },
    body: JSON.stringify(input),
  });
}

export function listTickets(requesterId: number | undefined, params: TicketListParams = {}): Promise<TicketListResponse> {
  return readJson(`/api/tickets${queryString(params)}`, { headers: requesterHeaders(requesterId) });
}

export function getTicket(requesterId: number | undefined, ticketId: number): Promise<TicketDetail> {
  return readJson<TicketDetail | { ticket: TicketDetail }>(`/api/tickets/${ticketId}`, { headers: requesterHeaders(requesterId) }).then((result) => "ticket" in result ? result.ticket : result);
}

/**
 * Administrator detail reads use the authenticated Ticket endpoint. The
 * fallback keeps this client compatible with deployments that expose the
 * operational detail route to Administrators instead.
 */
export async function getAdminTicket(ticketId: number): Promise<TicketDetail> {
  try {
    return await getTicket(undefined, ticketId);
  } catch (error) {
    if (error instanceof ApiError && ![403, 404, 405].includes(error.status)) throw error;
    return getStaffTicket(ticketId);
  }
}

export function getAttachments(requesterId: number | undefined, ticketId: number): Promise<AttachmentMetadata[]> {
  return readJson(`/api/tickets/${ticketId}/attachments`, { headers: requesterHeaders(requesterId) });
}

export function uploadAttachment(requesterId: number | undefined, ticketId: number, file: File): Promise<{ attachment: AttachmentMetadata }> {
  const body = new FormData();
  body.append("file", file);
  return readJson(`/api/tickets/${ticketId}/attachments`, { method: "POST", headers: requesterHeaders(requesterId), body });
}

export async function downloadAttachment(requesterId: number | undefined, attachmentId: number): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, withSession({ headers: requesterHeaders(requesterId) }));
  if (!response.ok) throw await responseError(response);
  return response.blob();
}

export function removeAttachment(requesterId: number | undefined, attachmentId: number, reason: string): Promise<{ attachment: AttachmentMetadata }> {
  return readJson(`/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...requesterHeaders(requesterId) },
    body: JSON.stringify({ reason }),
  });
}

export async function listStaffTickets(params: StaffTicketListParams = {}): Promise<StaffTicketListResponse> {
  const result = await readJson<StaffTicketListResponse & { tickets?: TicketSummary[] }>(`/api/staff/tickets${queryString(params)}`);
  return { ...result, items: result.items ?? result.tickets ?? [] };
}

export async function getStaffTicket(ticketId: number): Promise<StaffTicketDetail> {
  const result = await readJson<StaffTicketDetail | { ticket: StaffTicketDetail }>(`/api/staff/tickets/${ticketId}`);
  return "ticket" in result ? result.ticket : result;
}

export async function getAssignableStaff(): Promise<StaffUser[]> {
  return readJson("/api/staff/users");
}

export async function claimTicket(ticketId: number): Promise<StaffTicketDetail | { ticket: StaffTicketDetail }> {
  return readJson(`/api/staff/tickets/${ticketId}/claim`, { method: "POST" });
}

export async function assignTicket(ticketId: number, ownerId: number | null): Promise<StaffTicketDetail | { ticket: StaffTicketDetail }> {
  return readJson(`/api/staff/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId, ownerUserId: ownerId, assignedToId: ownerId }),
  });
}

export async function updateTicketPriority(ticketId: number, itPriority: RequestedPriority, role?: UserRole): Promise<StaffTicketDetail | { ticket: StaffTicketDetail }> {
  const request = (path: string) => readJson<StaffTicketDetail | { ticket: StaffTicketDetail }>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itPriority, priority: itPriority }),
  });
  try {
    return await request(`/api/staff/tickets/${ticketId}/priority`);
  } catch (error) {
    // Some deployments give Administrators a dedicated read-only ticket
    // operation endpoint. Prefer the shared Staff route when it is enabled,
    // then adapt to that endpoint when the server advertises it separately.
    if (role !== "ADMINISTRATOR" || !(error instanceof ApiError) || ![403, 404, 405].includes(error.status)) throw error;
    return request(`/api/admin/tickets/${ticketId}/priority`);
  }
}

export async function updateTicketStatus(ticketId: number, status: TicketStatus, confirm = false): Promise<StaffTicketDetail | { ticket: StaffTicketDetail }> {
  return readJson(`/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, currentStatus: status, confirm }),
  });
}

export async function getPublicComments(ticketId: number): Promise<PublicComment[]> {
  const result = await readJson<unknown>(`/api/tickets/${ticketId}/comments`);
  return Array.isArray(result) ? result as PublicComment[] : ((result as { comments?: PublicComment[]; items?: PublicComment[] })?.comments ?? (result as { items?: PublicComment[] })?.items ?? []);
}

export async function addPublicComment(ticketId: number, content: string): Promise<PublicComment> {
  const result = await readJson<unknown>(`/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, body: content }),
  });
  return ((result as { comment?: PublicComment })?.comment ?? result) as PublicComment;
}

export async function getInternalNotes(ticketId: number): Promise<InternalNote[]> {
  const result = await readJson<unknown>(`/api/staff/tickets/${ticketId}/notes`);
  return Array.isArray(result) ? result as InternalNote[] : ((result as { notes?: InternalNote[]; items?: InternalNote[] })?.notes ?? (result as { items?: InternalNote[] })?.items ?? []);
}

export async function addInternalNote(ticketId: number, content: string): Promise<InternalNote> {
  const result = await readJson<unknown>(`/api/staff/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, body: content }),
  });
  return ((result as { note?: InternalNote })?.note ?? result) as InternalNote;
}

export async function markProblemResolved(ticketId: number): Promise<StaffTicketDetail | { ticket: StaffTicketDetail }> {
  return readJson(`/api/tickets/${ticketId}/problem-appears-resolved`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appearsResolved: true, problemAppearsResolved: true }),
  });
}

// Backwards-compatible names for callers that model the operations screen as
// a queue or an administrator action.
export const getTicketQueue = listStaffTickets;
export const updateTicketItPriority = updateTicketPriority;

export interface UserRecord extends AuthUser {
  isActive: boolean;
}

export interface UserListParams {
  search?: string;
  role?: UserRole;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
  confirmPassword?: string;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export async function listUsers(params: UserListParams = {}): Promise<UserRecord[]> {
  const result = await readJson<unknown>(`/api/admin/users${queryString(params)}`);
  return Array.isArray(result) ? result as UserRecord[] : ((result as { users?: UserRecord[]; items?: UserRecord[] })?.users ?? (result as { items?: UserRecord[] })?.items ?? []);
}

export const getUsers = listUsers;

export async function createUser(input: CreateUserInput): Promise<UserRecord | { user: UserRecord }> {
  return readJson("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateUser(userId: number, input: UpdateUserInput): Promise<UserRecord | { user: UserRecord }> {
  return readJson(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function setInitialPassword(userId: number, initialPassword: string): Promise<void> {
  await readJson(`/api/admin/users/${userId}/initial-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initialPassword, password: initialPassword }),
  });
}

export const resetInitialPassword = setInitialPassword;

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Ask the backend whether it is alive, then read the category list from it.
export async function checkSystem(): Promise<SystemStatus> {
  const health = await fetch(`${API_URL}/api/health`, withSession());
  if (!health.ok) throw new Error(`Health check failed (HTTP ${health.status})`);
  const categoriesResponse = await fetch(`${API_URL}/api/categories`, withSession());
  if (!categoriesResponse.ok) throw new Error(`Category list failed (HTTP ${categoriesResponse.status})`);
  const categories: Category[] = await categoriesResponse.json();
  return { online: true, categories };
}
