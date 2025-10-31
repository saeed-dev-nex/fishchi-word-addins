// src/taskpane/types/fishchi.ts

/**
 * Represents a single Project from the server.
 */
export interface Project {
  _id: string;
  name: string;
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
  authors: { firstName?: string; lastName: string }[];
  year?: string;
  publisher?: string;
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
