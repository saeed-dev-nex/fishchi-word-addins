// src/taskpane/types/fishchi.ts

/**
 * Represents a single Project from the server.
 */
export interface Project {
  _id: string;
  title: string;
  sources: string[]; // Array of Source IDs
  description?: string;
  user: string; // User ID
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a single Source (reference) from the server.
 * Based on Source.model.js
 */
export interface Source {
  _id: string;
  project: string; // Project ID
  user: string; // User ID
  type: string; // e.g., 'book', 'article-journal'
  title: string;
  authors: { firstname?: string; lastname: string }[];
  year?: string;
  publisher?: string;
  language?: string; // Language of the source (e.g., 'persian', 'english', 'fa-IR', 'en-US')
  // ... other CSL fields as needed
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a single Note (Fish) from the server.
 * Based on Note.model.js
 */
export interface Note {
  _id: string;
  source: string; // Source ID
  project: string; // Project ID
  user: string; // User ID
  content: string; // The rich text content of the note
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents the authenticated user's profile.
 */
export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T; // The actual data is nested inside this 'data' property
  message: string;
  success: boolean;
}

/**
 * Defines the available citation styles.
 * These MUST match the file names in `server/node_modules/csl-styles`
 */
export type CitationStyle =
  | "apa"
  | "mla"
  | "chicago-author-date"
  | "vancouver"
  | "harvard-cite-them-right";

/**
 * The data sent to the server to format a citation.
 */
export interface FormatCitationRequest {
  sourceId: string;
  style: CitationStyle;
  // We can add more source IDs later for complex citations
  // itemIdsToCite: string[];
}

/**
 * The formatted data received from the server.
 */
export interface FormattedCitation {
  sourceId: string;
  style: CitationStyle;
  inText: string; // The in-text citation, e.g., "(Doe, 2025)"
  bibliography: string; // The full bibliography entry
}
export const UNASSIGNED_PROJECT_ID = "___UNASSIGNED___";

export const CITATION_STYLES = [
  { value: "apa", label: "APA" },
  { value: "mla", label: "MLA" },
  { value: "vancouver", label: "Vancouver" },
  { value: "chicago-author-date", label: "Chicago" },
  { value: "harvard-cite-them-right", label: "Harvard" },
] as const;

export const BIBLIOGRAPHY_LANGUAGES = [
  { value: "fa-IR", label: "فارسی (پیش‌فرض)" },
  { value: "en-US", label: "English" },
] as const;

export type BibLanguage = "fa-IR" | "en-US";
