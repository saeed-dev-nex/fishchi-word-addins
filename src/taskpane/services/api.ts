/* global OfficeRuntime, console, fetch, window, RequestInit, Headers */

import { Project, Source, Note, UserProfile } from "../types/fishchi";

/**
 * Validates if a value is a valid object (not null, not array)
 */
function isValidObject(value: any): boolean {
  return (
    value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value)
  );
}

/**
 * Validates if a value is a valid array
 */
function isValidArray(value: any): boolean {
  return Array.isArray(value);
}

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
    } catch {
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
  let apiResponse: any;

  try {
    apiResponse = await response.json();
  } catch (jsonError) {
    console.error("Failed to parse JSON response:", jsonError);
    throw new Error("Invalid JSON response from server");
  }

  console.log("API Response received:", {
    success: apiResponse.success,
    hasData: apiResponse.data !== undefined && apiResponse.data !== null,
    message: apiResponse.message,
    statusCode: apiResponse.statusCode,
    url: url,
  });

  // Handle different response structures
  // Case 1: {status: "success", data: {...}}
  if (apiResponse.status !== undefined) {
    console.log("Server uses 'status' field instead of 'success'");

    if (apiResponse.status === "success" || apiResponse.status === true) {
      // Success - unwrap data if it exists
      if (apiResponse.data !== undefined && apiResponse.data !== null) {
        console.log("Unwrapping 'data' field from response");
        return apiResponse.data;
      } else {
        console.warn("API returned status=success but no data for:", url);
        return apiResponse.data;
      }
    } else {
      // Error case
      const errorMsg = apiResponse.message || apiResponse.error || "API request failed";
      console.error("API returned status:", apiResponse.status, errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Case 2: {success: true/false, data: {...}}
  if (apiResponse.success !== undefined) {
    if (apiResponse.success === false) {
      const errorMsg = apiResponse.message || apiResponse.error || "API request failed";
      console.error("API returned success=false:", errorMsg);
      throw new Error(errorMsg);
    }

    // If data is null or undefined but success is true
    if (apiResponse.data === undefined || apiResponse.data === null) {
      console.warn("API returned success=true but no data for:", url);
      return apiResponse.data;
    }

    // Return the unwrapped data
    return apiResponse.data;
  }

  // Case 3: Response doesn't have 'success' or 'status' field
  console.warn("Response doesn't have 'success' or 'status' field, assuming direct data response");
  return apiResponse;
}
/**
 * Fetches all projects for the authenticated user.
 * Corresponds to: GET /api/projects
 */
export async function apiGetProjects(): Promise<Project[]> {
  try {
    const response = await authenticatedFetch(`${API_V1_URL}/projects`);

    if (!isValidArray(response)) {
      console.error("Invalid projects response:", response);
      throw new Error("Expected array of projects, got: " + typeof response);
    }

    return response;
  } catch (error: any) {
    // If 404, return empty array (no projects found)
    if (error.message && error.message.includes("404")) {
      console.warn("No projects found (404), returning empty array");
      return [];
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Fetches all sources for a specific project.
 * Corresponds to: GET /api/sources?projectId=...
 * Returns paginated response with sources array
 */
export async function apiGetSourcesByProject(projectId: string): Promise<Source[]> {
  try {
    const response = await authenticatedFetch(`${API_V1_URL}/sources?projectId=${projectId}`);

    // Handle paginated response: { sources: [...], pagination: {...}, ... }
    if (isValidObject(response) && response.sources !== undefined) {
      if (!isValidArray(response.sources)) {
        console.error("Invalid sources array in response:", response.sources);
        throw new Error("Expected sources to be an array, got: " + typeof response.sources);
      }
      console.log(`Retrieved ${response.sources.length} sources for project ${projectId}`);
      return response.sources;
    }

    // Fallback: if response is directly an array (for backwards compatibility)
    if (isValidArray(response)) {
      console.log(`Retrieved ${response.length} sources for project ${projectId} (direct array)`);
      return response;
    }

    console.error("Invalid sources response:", response);
    throw new Error("Expected sources array or paginated response, got: " + typeof response);
  } catch (error: any) {
    // If 404, return empty array (no sources in this project)
    if (error.message && error.message.includes("404")) {
      console.warn(`No sources found for project ${projectId} (404), returning empty array`);
      return [];
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Fetches all notes for a specific source.
 * Corresponds to: GET /api/notes?projectId=...&sourceId=...
 */
export async function apiGetNotesBySource(projectId: string, sourceId: string): Promise<Note[]> {
  try {
    const response = await authenticatedFetch(
      `${API_V1_URL}/notes?projectId=${projectId}&sourceId=${sourceId}`
    );

    if (!isValidArray(response)) {
      console.error("Invalid notes response:", response);
      throw new Error("Expected array of notes, got: " + typeof response);
    }

    return response;
  } catch (error: any) {
    // If 404, return empty array (no notes for this source)
    if (error.message && error.message.includes("404")) {
      console.warn(`No notes found for source ${sourceId} (404), returning empty array`);
      return [];
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Fetches the profile of the currently authenticated user.
 * Tries /users/me endpoint first, with fallback to /users/profile
 */
export async function apiGetSelfProfile(tokenOverride?: string): Promise<UserProfile> {
  // Try the primary endpoint
  try {
    console.log("Attempting to fetch profile from /users/me");
    const response = await authenticatedFetch(`${API_V1_URL}/users/me`, {}, tokenOverride);
    console.log("Profile response from /users/me:", response);

    if (response && (response.username || response.email || response._id)) {
      return response;
    }

    console.warn("Response from /users/me is invalid, trying /users/profile");
  } catch (error) {
    console.warn("Failed to fetch from /users/me, trying /users/profile:", error);
  }

  // Fallback to alternative endpoint
  console.log("Attempting to fetch profile from /users/profile");
  const response = await authenticatedFetch(`${API_V1_URL}/users/profile`, {}, tokenOverride);
  console.log("Profile response from /users/profile:", response);
  console.log("Response type:", typeof response);
  console.log("Response keys:", response ? Object.keys(response) : "null/undefined");
  console.log("Response JSON:", JSON.stringify(response, null, 2));

  if (!isValidObject(response)) {
    console.error("Invalid profile response type:", typeof response, response);
    throw new Error("Invalid profile response: expected object, got " + typeof response);
  }

  // Normalize field names to handle different server response formats
  const normalizedProfile: any = { ...response };

  // Handle ID field variations (_id, id)
  if (!normalizedProfile._id) {
    if (normalizedProfile.id) {
      console.log("Converting 'id' to '_id'");
      normalizedProfile._id = normalizedProfile.id;
    }
  }

  // Handle username field variations (username, name, userName, user_name)
  if (!normalizedProfile.username) {
    if (normalizedProfile.name) {
      console.log("Converting 'name' to 'username'");
      normalizedProfile.username = normalizedProfile.name;
    } else if (normalizedProfile.userName) {
      console.log("Converting 'userName' to 'username'");
      normalizedProfile.username = normalizedProfile.userName;
    } else if (normalizedProfile.user_name) {
      console.log("Converting 'user_name' to 'username'");
      normalizedProfile.username = normalizedProfile.user_name;
    }
  }

  // Handle email field variations (email, emailAddress, email_address)
  if (!normalizedProfile.email) {
    if (normalizedProfile.emailAddress) {
      console.log("Converting 'emailAddress' to 'email'");
      normalizedProfile.email = normalizedProfile.emailAddress;
    } else if (normalizedProfile.email_address) {
      console.log("Converting 'email_address' to 'email'");
      normalizedProfile.email = normalizedProfile.email_address;
    }
  }

  // Log what we found after normalization
  console.log("Normalized profile fields:");
  console.log("  _id:", normalizedProfile._id);
  console.log("  username:", normalizedProfile.username);
  console.log("  email:", normalizedProfile.email);
  console.log("  avatar:", normalizedProfile.avatar);

  // Verify we have at least some identifying information
  const hasId = !!(normalizedProfile._id || normalizedProfile.id);
  const hasUsername = !!normalizedProfile.username;
  const hasEmail = !!normalizedProfile.email;

  if (!hasId && !hasUsername && !hasEmail) {
    console.error("❌ Profile validation failed!");
    console.error("Original response:", response);
    console.error("Available fields:", Object.keys(response));
    console.error("Expected at least one of: _id, id, username, name, email");

    throw new Error(
      `Invalid profile response: missing required fields. ` +
        `Available fields: ${Object.keys(response).join(", ")}`
    );
  }

  console.log("✅ Profile validation passed!");
  return normalizedProfile;
}
