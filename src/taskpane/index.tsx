// src/taskpane/index.tsx
import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

/* global document, Office */

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element.");
}

const root = createRoot(rootElement);

/**
 * AppWrapper component that manages Office initialization state
 * This fixes the race condition where isOfficeInitialized was captured
 * at render time and never updated when Office became ready
 */
const AppWrapper: React.FC = () => {
  const [isOfficeInitialized, setIsOfficeInitialized] = React.useState(false);
  const officeInitRef = React.useRef(false);

  React.useEffect(() => {
    // Prevent multiple Office.onReady calls (especially in StrictMode)
    if (officeInitRef.current) {
      console.log("AppWrapper: Office.onReady already set up, skipping...");
      return () => {}; // Return empty cleanup function to satisfy TypeScript
    }

    console.log("AppWrapper: Setting up Office.onReady listener...");
    officeInitRef.current = true;

    Office.onReady(() => {
      console.log("Office.onReady() called, updating state.");
      setIsOfficeInitialized(true);
    });

    // Cleanup function
    return () => {
      console.log("AppWrapper: Cleaning up Office.onReady listener...");
    };
  }, []);

  console.log("AppWrapper: Rendering with isOfficeInitialized =", isOfficeInitialized);

  return (
    // StrictMode temporarily disabled to prevent double-render issues
    // <React.StrictMode>
    <ErrorBoundary>
      <FluentProvider theme={webLightTheme}>
        <AuthProvider isOfficeInitialized={isOfficeInitialized}>
          <App />
        </AuthProvider>
      </FluentProvider>
    </ErrorBoundary>
    // </React.StrictMode>
  );
};

/**
 * Render the AppWrapper which handles Office initialization
 */
console.log("Initial render: Mounting AppWrapper component");
root.render(<AppWrapper />);
