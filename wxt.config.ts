import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: 'DeafCS Tools',
    description: 'Helper for DeafCS players: auto-accept, player and map stats, server IP copy and auto-join, queue dots.',
    // "scripting" is for Chrome only: the background injects the content script into tabs open at
    // install time. Firefox does that itself, and that code isn't in the Firefox build.
    permissions: ['storage', 'clipboardWrite', ...(browser === 'firefox' ? [] : ['scripting'])],
    host_permissions: ['https://*.deafcs.net/*'],
    // Injected into the page's MAIN world by the content script (see entrypoints/copy-hook.ts).
    web_accessible_resources: [
      {
        resources: ['copy-hook.js'],
        matches: ['https://*.deafcs.net/*'],
      },
    ],
    // Firefox only: Chrome doesn't know the key.
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'deafcs-tools@csdeaf.com',
          // Required by AMO for new add-ons. Player & Map Stats sends the Steam IDs shown on a
          // deafcs.net match page to api.csdeaf.com; nothing else leaves the browser.
          data_collection_permissions: {
            required: ['websiteContent'],
          },
        },
      },
    }),
  }),
  zip: {
    // Local saved deafcs.net pages may contain real player data: never ship them in the sources zip.
    excludeSources: ['fixtures/**'],
  },
});
