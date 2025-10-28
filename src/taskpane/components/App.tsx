// In: word-addin/src/taskpane/components/App.tsx

import * as React from "react";
import { useState, useEffect, useRef } from "react";

//
// --- Fluent UI v9 Imports ---
//
// We import from '@fluentui/react-components'
import { Button, Spinner, Text, makeStyles, shorthands } from "@fluentui/react-components";

/* global Office */

//
// --- v9 Styling (makeStyles) ---
//
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch", // Use stretch for full-width items
    justifyContent: "flex-start",
    ...shorthands.padding("20px"),
    ...shorthands.gap("15px"),
    textAlign: "center",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    ...shorthands.gap("15px"),
  },
});

const App: React.FC = () => {
  // --- v9 Styling ---
  const styles = useStyles();

  // --- State & Refs ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isOfficeInitialized, setIsOfficeInitialized] = useState(false);
  const pollIntervalId = useRef<number | null>(null);

  // --- Polling Logic ---
  const stopPolling = () => {
    if (pollIntervalId.current) {
      clearInterval(pollIntervalId.current);
      pollIntervalId.current = null;
    }
    setIsPolling(false);
  };

  // --- Office Initialize Effect ---
  useEffect(() => {
    // Ensure Office is initialized
    if (Office.context) {
      setIsOfficeInitialized(true);
    } else {
      // If Office isn't initialized yet, set up the Office.initialize handler
      Office.initialize = () => {
        setIsOfficeInitialized(true);
      };
    }
  }, []);

  // --- Token Check Effect (runs after Office is initialized) ---
  useEffect(() => {
    if (!isOfficeInitialized) {
      return () => {
        // No cleanup needed if Office is not initialized
      };
    }

    try {
      // 1. Check for existing token on load
      if (Office.context && Office.context.roamingSettings) {
        const token = Office.context.roamingSettings.get("jwt_token");
        if (token) {
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error("Error accessing Office.context.roamingSettings:", error);
    }

    // 2. Cleanup function (runs on unmount)
    return () => {
      stopPolling();
    };
  }, [isOfficeInitialized]); // Depends on Office initialization

  // --- Login Handler ---
  const handleLogin = () => {
    if (!isOfficeInitialized) {
      console.error("Office API is not initialized yet");
      return;
    }

    try {
      // 1. Generate session ID
      const sessionId = crypto.randomUUID();

      // 2. Open browser
      const loginUrl = `https://localhost:3000/login?from=office&session_id=${sessionId}`;

      if (Office.context && Office.context.ui) {
        Office.context.ui.openBrowserWindow(loginUrl);

        // 3. Start polling
        setIsPolling(true);

        pollIntervalId.current = window.setInterval(async () => {
          try {
            // Poll the HTTPS backend
            const response = await fetch(
              `https://localhost:5000/api/v1/auth/poll-login/${sessionId}`
            );

            if (response.ok) {
              // 200 OK: Success
              const data = await response.json();
              if (data.token) {
                stopPolling();
                if (Office.context && Office.context.roamingSettings) {
                  Office.context.roamingSettings.set("jwt_token", data.token);
                  Office.context.roamingSettings.saveAsync((saveResult) => {
                    if (saveResult.status === Office.AsyncResultStatus.Succeeded) {
                      setIsLoggedIn(true);
                    } else {
                      console.error("Failed to save token to roaming settings");
                    }
                  });
                } else {
                  console.error("Office.context.roamingSettings is not available");
                  // Still set the user as logged in even if we can't save the token
                  setIsLoggedIn(true);
                }
              }
              return;
            } else if (response.status === 404) {
              // 404 Not Found: Pending... (this is expected)
              console.log("Polling... token not ready.");
              return;
            } else {
              // Other error (e.g., 500)
              console.error("Polling failed:", response.status);
              stopPolling();
              return;
            }
          } catch (err) {
            console.error("Network error during polling:", err);
            stopPolling();
            return;
          }
        }, 3000); // Poll every 3 seconds
      } else {
        console.error("Office.context.ui is not available");
      }
    } catch (error) {
      console.error("Error in handleLogin:", error);
    }
  };

  // --- Render Logic ---
  if (isLoggedIn) {
    return (
      <div className={styles.root}>
        <Text weight="semibold">شما با موفقیت وارد شده‌اید!</Text>
        <Text>می‌توانید از امکانات فیشچی در Word استفاده کنید.</Text>
        {/* Main application UI (Project list, etc.) will go here */}
      </div>
    );
  }

  if (isPolling) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <Spinner label="در حال انتظار برای ورود..." />
          <Text>لطفاً در مرورگری که باز شد، وارد شوید.</Text>
          <Text size={200}>پس از ورود، این پنجره به طور خودکار به‌روز می‌شود.</Text>
        </div>
        <Button onClick={stopPolling}>لغو</Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Text weight="semibold">به فیشچی خوش آمدید!</Text>
      <Text>برای دسترسی به پروژه‌ها و فیش‌های خود، لطفاً وارد شوید.</Text>
      {/* v9 Button: Use 'appearance' prop */}
      <Button appearance="primary" onClick={handleLogin}>
        ورود به حساب کاربری
      </Button>
    </div>
  );
};

export default App;
