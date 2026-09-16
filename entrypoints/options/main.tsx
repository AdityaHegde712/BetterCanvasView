/**
 * @fileoverview Mounts the Better Canvas View dashboard.
 */

import "@mantine/core/styles.css";
import "./styles.css";

import { createTheme, MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";
import { browser } from "wxt/browser";

import { CanvasDatabase } from "../../src/storage/database";
import { App } from "./App";

const theme = createTheme({
  defaultRadius: "sm",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  primaryColor: "indigo",
});
const database = new CanvasDatabase("better-canvas-view");
const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Dashboard root element is missing.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <App
        database={database}
        now_fn={() => new Date()}
        send_message={browser.runtime.sendMessage}
      />
    </MantineProvider>
  </React.StrictMode>,
);
