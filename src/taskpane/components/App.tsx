import * as React from "react";
import {
  FluentProvider,
  webLightTheme,
  Title1,
  Body1,
  Button,
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect } from "react";
// --- NEW STRATEGY: Import OfficeRuntime ---
// This gives us access to the stable, async storage

// --- Styles Configuration ---
const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: "20px",
    textAlign: "center",
  },
  logo: {
    width: "80px",
    height: "80px",
    marginBottom: tokens.spacingVerticalL,
  },
  title: {
    marginBottom: tokens.spacingVerticalS,
  },
  body: {
    marginBottom: tokens.spacingVerticalXXL,
  },
  spinnerContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
});
// --- End Styles ---

// --- Define Props Interface ---
interface AppProps {
  title: string;
  isOfficeInitialized: boolean;
}
// --- End Props Interface ---

const App: React.FC<AppProps> = ({ title, isOfficeInitialized }) => {
  const styles = useStyles();

  // --- State Definitions ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Office.Dialog | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  // --- End State Definitions ---

  // --- Constants ---
  const apiBaseUrl = "https://localhost:5000/api/v1/auth";
  const loginPageUrl = "https://localhost:3000/login";
  const TOKEN_KEY = "fishchi-token"; // Storage key
  // --- End Constants ---

  // ---
  // ---
  // ---
  // --- NEW STRATEGY: Use async useEffect with OfficeRuntime.storage
  // ---
  // ---
  // ---
  useEffect(() => {
    // This async function checks for the stored token
    const checkLoginStatus = async () => {
      try {
        // Use the new async storage API to get the token
        const storedToken = await OfficeRuntime.storage.getItem(TOKEN_KEY);

        if (storedToken) {
          console.log("Token found in OfficeRuntime.storage:", storedToken);
          // TODO: Add token validation with server here
          setToken(storedToken);
          setIsLoggedIn(true);
        } else {
          console.log("No token found in OfficeRuntime.storage.");
        }
      } catch (e) {
        console.error("Error accessing OfficeRuntime.storage on load:", e);
      }
      // We are done checking, stop loading
      setIsLoading(false);
    };

    // We still need isOfficeInitialized to be true before we
    // try to access *any* Office APIs, even OfficeRuntime.
    if (isOfficeInitialized) {
      console.log("Office is initialized, checking login status...");
      checkLoginStatus();
    } else {
      console.log("Office not initialized, waiting...");
    }
  }, [isOfficeInitialized]);
  // ---
  // ---
  // --- END NEW STRATEGY ---
  // ---
  // ---

  // ---
  // ---
  // ---
  // --- NEW STRATEGY: Save token using OfficeRuntime.storage
  // ---
  // ---
  // ---
  const pollForToken = (sessionId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/poll-login/${sessionId}`);
        if (!response.ok) {
          console.error(`Polling error: ${response.statusText}`);
          return;
        }

        const data = await response.json();
        if (data.token) {
          // --- Token Received ---
          console.log("Token received from poll!", data.token);
          clearInterval(interval);
          setPollingInterval(null);
          setPolling(false);

          // Update React state
          setToken(data.token);
          setIsLoggedIn(true);
          setIsLoading(false);
          dialog?.close();

          // --- THIS IS THE FIX ---
          // Save the token IMMEDIATELY and ASYNCHRONOUSLY
          try {
            console.log("Attempting to save token to OfficeRuntime.storage...");
            await OfficeRuntime.storage.setItem(TOKEN_KEY, data.token);
            console.log("Token successfully saved to OfficeRuntime.storage.");
          } catch (error) {
            // This is very unlikely but good to have
            console.error("Error saving token to OfficeRuntime.storage:", error);
          }
          // --- END OF FIX ---
          // --- End Token Received ---
        } else {
          console.log("Polling... token not ready.");
        }
      } catch (error) {
        console.error("Polling fetch error:", error);
      }
    }, 3000);
    setPollingInterval(interval);
  };
  // ---
  // ---
  // --- END NEW STRATEGY ---
  // ---
  // ---

  // --- FUNCTION: Handle Login ---
  // This function still needs Office.context.ui, so the guard remains
  const handleLogin = async () => {
    if (!(Office && Office.context && Office.context.ui)) {
      console.error("Cannot login: Office context (UI) is not ready.");
      return;
    }

    setIsLoading(true);
    try {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      const loginUrl = `${loginPageUrl}?from=office&session_id=${newSessionId}`;

      Office.context.ui.displayDialogAsync(
        loginUrl,
        { height: 60, width: 40, displayInIframe: false },
        (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.error("Dialog failed to open:", asyncResult.error.message);
            setIsLoading(false);
            return;
          }
          const dialogInstance = asyncResult.value;
          setDialog(dialogInstance);

          dialogInstance.addEventHandler(Office.EventType.DialogEventReceived, (arg: any) => {
            if (arg.error === 12006 || arg.error === 12007) {
              console.log("Dialog closed by user or navigated away.");
              setIsLoading(false);
              setPolling(false);
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
            }
          });
        }
      );

      pollForToken(newSessionId);
    } catch (error) {
      console.error("Login process error:", error);
      setIsLoading(false);
    }
  };
  // --- END FUNCTION ---

  // ---
  // ---
  // ---
  // --- NEW STRATEGY: Remove token using OfficeRuntime.storage
  // ---
  // ---
  // ---
  const handleLogout = async () => {
    // Step 1: Immediately log out of the React UI state.
    setToken(null);
    setIsLoggedIn(false);

    // Step 2: Try to remove the token from persistent storage.
    try {
      console.log("Attempting to remove token from OfficeRuntime.storage...");
      await OfficeRuntime.storage.removeItem(TOKEN_KEY);
      console.log("Token successfully removed from OfficeRuntime.storage.");
    } catch (error) {
      console.error("Error removing token from OfficeRuntime.storage:", error);
    }
  };
  // ---
  // ---
  // --- END NEW STRATEGY ---
  // ---
  // ---

  // --- RENDER LOGIC ---
  if (isLoading || polling) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div className={styles.spinnerContainer}>
          <Spinner
            size="huge"
            label={
              polling
                ? "در حال بررسی وضعیت ورود... لطفاً پنجره مرورگر را بررسی کنید."
                : "در حال بارگذاری..."
            }
          />
        </div>
      </FluentProvider>
    );
  }

  // Logged out state
  if (!isLoggedIn) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div className={styles.container}>
          <img src="assets/logo-filled.png" alt="Fishchi Logo" className={styles.logo} />
          <Title1 className={styles.title}>به فیشچی خوش آمدید</Title1>
          <Body1 className={styles.body}>برای دسترسی به پروژه‌ها و فیش‌های خود وارد شوید.</Body1>
          <Button
            appearance="primary"
            size="large"
            onClick={handleLogin}
            disabled={!isOfficeInitialized}
          >
            ورود به حساب کاربری
          </Button>
        </div>
      </FluentProvider>
    );
  }

  // Logged in state
  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ padding: 20 }}>
        <Title1>{title}</Title1>
        <Body1>شما با موفقیت وارد شده‌اید.</Body1>
        <Body1 style={{ wordBreak: "break-all", marginTop: "10px" }}>
          Token: {token ? token.substring(0, 40) + "..." : "No Token"}
        </Body1>
        <Button
          onClick={handleLogout}
          appearance="primary"
          style={{ marginTop: 20 }}
          disabled={!isOfficeInitialized}
        >
          خروج
        </Button>
      </div>
    </FluentProvider>
  );
  // --- END RENDER LOGIC ---
};

export default App;
