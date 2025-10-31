import { Project, Source, Note, UserProfile, ApiResponse } from "../types/fishchi";

// This should point to your production or development server
const API_V1_URL = "https://localhost:5000/api/v1"; // ⚠️ [TODO]: Update with your actual server URL

/**
 * Retrieves the stored auth token (e.g., from localStorage or Office.settings).
 * This is a placeholder; you should implement it based on your auth logic.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await OfficeRuntime.storage.getItem("fishchi-token");
  } catch (e) {
    console.error("Storage error in getAuthToken:", e);
    return null;
  }
}
/**
 * A helper function to perform authenticated fetch requests.
 * [MODIFIED] It now understands the server's `ApiResponse` wrapper
 * and automatically unwraps the `.data` property.
 */
async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  tokenOverride?: string | null
): Promise<any> {
  // Return type is now 'any' because it unwraps dynamically
  const token = tokenOverride || (await getAuthToken());

  const headers = new Headers(options.headers || {});
  headers.append("Content-Type", "application/json");
  if (token) {
    headers.append("Authorization", `Bearer ${token}`);
  } else {
    console.error("authenticatedFetch: No token provided or found in storage.");
  }

  const response = await fetch(url, {
    ...options,
    headers: headers,
  });

  // --- Error handling (401, etc.) remains the same ---
  if (response.status === 401) {
    console.error("Unauthorized request (401). Token might be invalid.");
    try {
      await OfficeRuntime.storage.removeItem("fishchi-token");
    } catch (e) {
      /* ignore */
    }
    window.location.reload();
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  // --- End error handling ---

  // [FIX] Unwrap the server's ApiResponse object
  // We type the response to our new generic interface
  const apiResponse: ApiResponse<any> = await response.json();

  if (apiResponse.success && apiResponse.data !== undefined) {
    // Return *only* the data property, as the components expect
    return apiResponse.data;
  } else {
    // If 'success' is false or data is missing, throw an error
    throw new Error(apiResponse.message || "API request failed but reported success");
  }
}
/**
 * Fetches all projects for the authenticated user.
 * Corresponds to: GET /api/projects
 */
export async function apiGetProjects(): Promise<Project[]> {
  const response = await authenticatedFetch(`${API_V1_URL}/projects`);
  return await response.data;
}

/**
 * Fetches all sources for a specific project.
 * Corresponds to: GET /api/sources/project/:projectId
 */
export async function apiGetSourcesByProject(projectId: string): Promise<Source[]> {
  const response = await authenticatedFetch(`${API_V1_URL}/sources/project/${projectId}`);
  return await response.data;
}

/**
 * Fetches all notes for a specific source.
 * Corresponds to: GET /api/notes/source/:sourceId
 */
export async function apiGetNotesBySource(sourceId: string): Promise<Note[]> {
  const response = await authenticatedFetch(`${API_V1_URL}/notes/source/${sourceId}`);
  return await response.data;
}

/**
 * Fetches the profile of the currently authenticated user.
 * Corresponds to: GET /api/v1/users/me (based on user.routes.js in server)
 */
export async function apiGetSelfProfile(tokenOverride?: string): Promise<UserProfile> {
  // Note: This uses the authenticatedFetch from the *previous* step,
  // which automatically gets the token from localStorage (or wherever you defined it).
  // We need to make sure authService.storeToken and api.getAuthToken are in sync!

  // ---
  // ⚠️ CRITICAL REFACTOR: We MUST sync authService.ts and api.ts
  // Let's modify api.ts to use OfficeRuntime.storage as well.
  // ---
  const response = await authenticatedFetch(`${API_V1_URL}/users/profile`, {}, tokenOverride);
  console.log("responseL: ", response);

  return await response.data;
}
