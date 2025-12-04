---
"@dm-hero/app": patch
---

feat: improve keyboard shortcut display with v-hotkey component

- Replace text-based keyboard hint with Vuetify v-hotkey component
- Add platform detection (Mac/PC) including Electron support
- Fix session cards minimum width (350px)
- Fix v-empty-state hydration mismatch on sessions page
- Fix README badge link for release workflow
