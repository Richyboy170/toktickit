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
  ) {
    super(message);
  }
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    let code: string | undefined;
    let message = "The request could not be completed.";
    try {
      const body = await response.json();
      code = body?.error?.code;
      message = body?.error?.message ?? message;
    } catch {
      // A non-JSON upstream failure still becomes one safe client error.
    }
    throw new ApiError(message, response.status, code);
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
