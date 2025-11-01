// src/taskpane/index.tsx
import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { AuthProvider } from "./contexts/AuthContext";

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

  React.useEffect(() => {
    console.log("AppWrapper: Setting up Office.onReady listener...");

    Office.onReady(() => {
      console.log("Office.onReady() called, updating state.");
      setIsOfficeInitialized(true);
    });
  }, []);

  console.log("AppWrapper: Rendering with isOfficeInitialized =", isOfficeInitialized);

  return (
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <AuthProvider isOfficeInitialized={isOfficeInitialized}>
          <App />
        </AuthProvider>
      </FluentProvider>
    </React.StrictMode>
  );
};

/**
 * Render the AppWrapper which handles Office initialization
 */
console.log("Initial render: Mounting AppWrapper component");
root.render(<AppWrapper />);
