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
    action: {
      default_title: "Open Better Canvas View",
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});
