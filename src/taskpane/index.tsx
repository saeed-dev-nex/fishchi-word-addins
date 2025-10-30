import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

/* global document, Office, module, require, HTMLElement */

const title = "فیشچی مدیریت پیشرفته منابع و فیش های تحقیق";
let isOfficeInitialized = true;
const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
Office.onReady(() => {
  console.log("Office.js is ready (in index.tsx).");

  root.render(
    <React.StrictMode>
      {/* This is where the prop is passed.
        App receives isOfficeInitialized={true}
      */}
      <App title={title} isOfficeInitialized={isOfficeInitialized} />
    </React.StrictMode>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(NextApp);
  });
}
