/* global OfficeRuntime, console, fetch, window, RequestInit, Headers */

import {
  Project,
  Source,
  Note,
  UserProfile,
  ApiResponse,
  FormatCitationRequest,
  FormattedCitation,
  CitationStyle,
} from "../types/fishchi";

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
const API_BASE_URL = "https://localhost:5000/api/v1"; // ⚠️ [TODO]: Update with your actual server URL

/**
 * Retrieves the stored auth token (e.g., from localStorage or Office.settings).
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
 * It now understands the server's `ApiResponse` wrapper
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
    // AuthContext will handle showing login screen when this error is thrown
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  if (!response.ok) {
    // Try to get error details from response body
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      console.error(`❌ API Error Response [${response.status}]:`, {
        url: url,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBody,
        message: errorBody?.message || errorBody?.error,
      });

      // Use server's error message if available
      if (errorBody?.message) {
        errorMessage = `${errorMessage}: ${errorBody.message}`;
      } else if (errorBody?.error) {
        errorMessage = `${errorMessage}: ${errorBody.error}`;
      }
    } catch (parseError) {
      // If response body can't be parsed as JSON, try text
      try {
        const errorText = await response.text();
        console.error(`❌ API Error Response [${response.status}] (text):`, {
          url: url,
          status: response.status,
          errorText: errorText.substring(0, 500), // Log first 500 chars
        });
        if (errorText) {
          errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
        }
      } catch (textError) {
        console.error(`❌ Could not parse error response body:`, parseError);
      }
    }
    throw new Error(errorMessage);
  }
  // --- End error handling ---

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
    const response = await authenticatedFetch(`${API_BASE_URL}/projects`);

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
 * Fetches all sources for a specific project OR unassigned sources.
 * Corresponds to: GET /api/sources?projectId=... OR /api/sources?unassigned=true
 * [MODIFIED] Accepts projectId as string or null.
 */
export async function apiGetSourcesByProject(projectId: string | null): Promise<Source[]> {
  try {
    // [MODIFIED] Create URL based on projectId.
    // If projectId is null, we assume the API supports ?unassigned=true
    // to fetch sources without a project.
    const url = projectId
      ? `${API_BASE_URL}/sources?projectId=${projectId}`
      : `${API_BASE_URL}/sources?unassigned=true`;

    const response = await authenticatedFetch(url);

    // Handle paginated response: { sources: [...], pagination: {...}, ... }
    if (isValidObject(response) && response.sources !== undefined) {
      if (!isValidArray(response.sources)) {
        console.error("Invalid sources array in response:", response.sources);
        throw new Error("Expected sources to be an array, got: " + typeof response.sources);
      }
      console.log(`Retrieved ${response.sources.length} sources.`);
      return response.sources;
    }

    // Fallback: if response is directly an array (for backwards compatibility)
    if (isValidArray(response)) {
      console.log(`Retrieved ${response.length} sources (direct array)`);
      return response;
    }

    console.error("Invalid sources response:", response);
    throw new Error("Expected sources array or paginated response, got: " + typeof response);
  } catch (error: any) {
    // If 404, return empty array (no sources found)
    if (error.message && error.message.includes("404")) {
      console.warn(`No sources found (404), returning empty array`);
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
      `${API_BASE_URL}/notes?projectId=${projectId}&sourceId=${sourceId}`
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
    const response = await authenticatedFetch(`${API_BASE_URL}/users/me`, {}, tokenOverride);
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
  const response = await authenticatedFetch(`${API_BASE_URL}/users/profile`, {}, tokenOverride);
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

export async function apiFormatCitation(
  request: FormatCitationRequest & {
    detectLanguage?: boolean;
    sourceLanguage?: string;
  }
): Promise<FormattedCitation> {
  // authenticatedFetch already unwraps the ApiResponse and returns the data directly
  const data = await authenticatedFetch(`${API_BASE_URL}/export/format-citation`, {
    method: "POST",
    body: JSON.stringify(request),
  });

  // The data is already unwrapped by authenticatedFetch
  return data as FormattedCitation;
}
/**
 * Fetches a formatted bibliography from the server.
 * Now accepts a 'lang' parameter.
 */
export async function apiFormatBibliography(
  sourceIds: string[],
  style: CitationStyle,
  lang: "fa-IR" | "en-US" | "auto" //  Accept lang parameter including auto
): Promise<string> {
  console.log("📚 [apiFormatBibliography] Preparing request:", {
    endpoint: `${API_BASE_URL}/export/format-bibliography`,
    sourceIds: sourceIds,
    sourceIdsCount: sourceIds.length,
    style: style,
    lang: lang,
  });

  try {
    const data = await authenticatedFetch(`${API_BASE_URL}/export/format-bibliography`, {
      method: "POST",
      body: JSON.stringify({
        sourceIds: sourceIds,
        style: style,
        lang: lang, //  Pass the selected lang to the server
      }),
    });

    console.log("✅ [apiFormatBibliography] Response received:", {
      hasData: !!data,
      hasHtml: !!data?.html,
      htmlLength: data?.html?.length,
      dataKeys: data ? Object.keys(data) : [],
    });

    if (!data || !data.html) {
      console.error("❌ [apiFormatBibliography] Invalid response structure:", data);
      throw new Error("Invalid bibliography response: missing html property");
    }

    return data.html;
  } catch (error: any) {
    console.error("❌ [apiFormatBibliography] Request failed:", {
      error: error.message,
      stack: error.stack,
      sourceIds: sourceIds,
      style: style,
      lang: lang,
    });
    throw error;
  }
}

// [NEW] Calls the AI translation endpoint on the server
/**
 * Translates a given text using the AI service.
 * @param text The text to translate (e.g., an in-text citation).
 * @param targetLang The target language (defaults to "Persian").
 * @returns The translated text.
 */
export async function apiTranslateText(
  text: string,
  targetLang: string = "Persian"
): Promise<string> {
  console.log(`🤖 [apiTranslateText] Requesting translation for: "${text}"`);
  try {
    const data = await authenticatedFetch(`${API_BASE_URL}/ai/translate`, {
      method: "POST",
      body: JSON.stringify({
        text: text,
        targetLang: targetLang,
      }),
    });

    // The server returns { translatedText: "..." }
    if (data && data.translatedText) {
      console.log(`✅ [apiTranslateText] Translation received: "${data.translatedText}"`);
      return data.translatedText;
    } else {
      console.error("❌ [apiTranslateText] Invalid translation response:", data);
      throw new Error("Invalid translation response from server");
    }
  } catch (error: any) {
    console.error("❌ [apiTranslateText] Translation request failed:", {
      error: error.message,
      stack: error.stack,
      text: text,
    });
    // Fallback: return the original text if translation fails
    return text;
  }
}

/**
 * Manages Vancouver citation numbering
 * @param action - Action to perform: 'reset', 'get', or 'set'
 * @param orderMap - Order map for 'set' action
 */
export async function apiManageVancouverNumbering(
  action: "reset" | "get" | "set",
  orderMap?: Record<string, number>
): Promise<any> {
  const requestBody: any = { action };
  if (action === "set" && orderMap) {
    requestBody.orderMap = orderMap;
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/export/manage-vancouver-numbering`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  // This function seems to return the raw response, not unwrapped data.
  // We'll assume the original implementation was correct.
  // *Correction*: authenticatedFetch *always* unwraps.
  // The original file had a .json() call here, which was wrong.
  // We will trust authenticatedFetch.

  return response; // response is already the unwrapped 'data'
}

/**
 * Enhanced citation formatting with Vancouver numbering support
 * @param request - Citation request with additional options
 */
export async function apiFormatCitationWithOptions(
  request: FormatCitationRequest & {
    citationOrder?: string[];
    resetVancouverOrder?: boolean;
  }
): Promise<FormattedCitation> {
  const data = await authenticatedFetch(`${API_BASE_URL}/export/format-citation`, {
    method: "POST",
    body: JSON.stringify(request),
  });

  return data as FormattedCitation;
}

/**
 * Enhanced bibliography formatting with citation ordering
 * @param sourceIds - Array of source IDs
 * @param style - Citation style
 * @param lang - Language
 * @param citationOrder - Order of citations for Vancouver numbering
 */
export async function apiFormatBibliographyWithOrder(
  sourceIds: string[],
  style: CitationStyle,
  lang: "fa-IR" | "en-US" | "auto",
  citationOrder: string[] = []
): Promise<string> {
  const data = await authenticatedFetch(`${API_BASE_URL}/export/format-bibliography`, {
    method: "POST",
    body: JSON.stringify({
      sourceIds: sourceIds,
      style: style,
      lang: lang,
      citationOrder: citationOrder,
    }),
  });

  return data.html;
}
/**
 * Convert citation style for all citations in document
 * @route POST /api/v1/export/convert-style
 */
export async function apiConvertStyle(request: {
  sourceIds: string[];
  currentStyle: CitationStyle;
  newStyle: CitationStyle;
  lang?: string;
}): Promise<{
  convertedCitations: Array<{
    sourceId: string;
    inText: string;
    error?: string;
  }>;
  bibliography: string;
  newStyle: string;
  totalConverted: number;
  successCount: number;
  errorCount: number;
}> {
  console.log("📡 [apiConvertStyle] Sending request:", {
    sourceCount: request.sourceIds.length,
    currentStyle: request.currentStyle,
    newStyle: request.newStyle,
    lang: request.lang,
  });

  try {
    const data = await authenticatedFetch(`${API_BASE_URL}/export/convert-style`, {
      method: "POST",
      body: JSON.stringify(request),
    });

    console.log("✅ [apiConvertStyle] Response received:", {
      totalConverted: data.totalConverted,
      successCount: data.successCount,
      errorCount: data.errorCount,
    });

    return data;
  } catch (error: any) {
    console.error("❌ [apiConvertStyle] Request failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
