// src/taskpane/index.tsx
import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { AuthProvider } from "./contexts/AuthContext";

/* global document, Office */

let isOfficeInitialized = false;

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element.");
}

const root = createRoot(rootElement);

/**
 * Renders the component using the new React 18 root.render API
 */
const render = (Component: React.FC) => {
  root.render(
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        {/* We pass isOfficeInitialized to the provider
            so it knows when to start checking for tokens.
        */}
        <AuthProvider isOfficeInitialized={isOfficeInitialized}>
          <Component />
        </AuthProvider>
      </FluentProvider>
    </React.StrictMode>
  );
};

/* Render application after Office initializes */
Office.onReady(() => {
  isOfficeInitialized = true;
  console.log("Office.onReady() called, rendering app.");
  render(App);
});

/* Initial render (App will show a spinner until Office is ready) */
if (!isOfficeInitialized) {
  console.log("Initial render, Office not yet ready.");
  render(App);
}

// Note: HMR (Hot Module Replacement) logic would need to be
// configured differently if it was in the original file,
// but this structure is the correct baseline for React 18.
