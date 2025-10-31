// src/taskpane/services/authService.ts
import { v4 as uuidv4 } from "uuid";

const apiBaseUrl = "https://localhost:5000/api/v1/auth"; // ⚠️ [TODO]: Update with your v1 URL
const loginPageUrl = "https://localhost:3000/login";
const TOKEN_KEY = "fishchi-token";

let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Polls the server for a token associated with a session ID.
 */
function pollForToken(
  sessionId: string,
  onTokenReceived: (token: string) => void,
  onFail: (error: string) => void
) {
  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/poll-login/${sessionId}`);
      if (!response.ok) {
        console.error(`Polling error: ${response.statusText}`);
        return; // Continue polling
      }

      const data = await response.json();
      if (data.token) {
        // --- Token Received ---
        console.log("Token received from poll!", data.token);
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = null;
        onTokenReceived(data.token); // Resolve the promise with the token
      } else {
        console.log("Polling... token not ready.");
      }
    } catch (error: any) {
      console.error("Polling fetch error:", error);
      onFail(error.message || "Polling failed");
    }
  }, 3000);
}

/**
 * Stops the polling process.
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("Polling stopped.");
  }
}

/**
 * Opens the Office Dialog for login and starts polling.
 * Returns a promise that resolves with the token.
 */
export const loginWithDialog = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!(Office && Office.context && Office.context.ui)) {
      console.error("Cannot login: Office context (UI) is not ready.");
      return reject(new Error("Office UI context not ready."));
    }

    const newSessionId = uuidv4();
    const loginUrl = `${loginPageUrl}?from=office&session_id=${newSessionId}`;

    Office.context.ui.displayDialogAsync(
      loginUrl,
      { height: 60, width: 40, displayInIframe: false },
      (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          console.error("Dialog failed to open:", asyncResult.error.message);
          return reject(new Error(asyncResult.error.message));
        }

        const dialogInstance = asyncResult.value;
        dialogInstance.addEventHandler(Office.EventType.DialogEventReceived, (arg: any) => {
          // 12006 = User closed dialog
          if (arg.error === 12006 || arg.error === 12007) {
            console.log("Dialog closed by user or navigated away.");
            stopPolling();
            reject(new Error("Dialog closed by user."));
          }
        });

        // Start polling for the token
        pollForToken(newSessionId, resolve, reject);
      }
    );
  });
};

/**
 * Securely stores the token using OfficeRuntime.storage.
 */
export const storeToken = async (token: string): Promise<void> => {
  try {
    await OfficeRuntime.storage.setItem(TOKEN_KEY, token);
    console.log("Token successfully saved to OfficeRuntime.storage.");
  } catch (error) {
    console.error("Error saving token to OfficeRuntime.storage:", error);
  }
};

/**
 * Retrieves the token from OfficeRuntime.storage.
 */
export const getToken = async (): Promise<string | null> => {
  try {
    const storedToken = await OfficeRuntime.storage.getItem(TOKEN_KEY);
    console.log(storedToken ? "Token found in storage." : "No token in storage.");
    return storedToken;
  } catch (e) {
    console.error("Error accessing OfficeRuntime.storage on load:", e);
    return null;
  }
};

/**
 * Removes the token from OfficeRuntime.storage.
 */
export const removeToken = async (): Promise<void> => {
  try {
    await OfficeRuntime.storage.removeItem(TOKEN_KEY);
    console.log("Token successfully removed from OfficeRuntime.storage.");
  } catch (error) {
    console.error("Error removing token from OfficeRuntime.storage:", error);
  }
};
