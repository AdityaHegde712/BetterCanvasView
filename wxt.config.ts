/**
 * @fileoverview Configures the Better Canvas View browser extension build.
 */

import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Better Canvas View",
    description: "A local, read-only SJSU Canvas agenda dashboard.",
    permissions: ["alarms"],
    host_permissions: ["https://sjsu.instructure.com/*"],
    icons: {
      16: "icon-16.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    action: {
      default_title: "Open Better Canvas View",
      default_icon: {
        16: "icon-16.png",
        48: "icon-48.png",
        128: "icon-128.png",
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});
