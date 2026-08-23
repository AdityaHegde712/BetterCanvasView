/**
 * @fileoverview Mounts the Better Canvas View diagnostics dashboard.
 */

import "@mantine/core/styles.css";
import "./styles.css";

import { createTheme, MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";

const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "sm",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
});

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Dashboard root element is missing.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
