import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'DeafCS Tools',
    description: 'Auto-Ready, Copy Server IP and Auto Join Server for DeafCS.',
    permissions: ['storage', 'clipboardWrite', 'scripting'],
    host_permissions: ['https://*.deafcs.net/*'],
    // Injected into the page's MAIN world by the content script (see entrypoints/copy-hook.ts).
    web_accessible_resources: [
      {
        resources: ['copy-hook.js'],
        matches: ['https://*.deafcs.net/*'],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'deafcs-tools@csdeaf.com',
      },
    },
  },
  zip: {
    // Local saved deafcs.net pages may contain real player data: never ship them in the sources zip.
    excludeSources: ['fixtures/**'],
  },
});
