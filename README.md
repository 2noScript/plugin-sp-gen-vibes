# Vibes

Independent source and downloadable generation plugin for Script-Pro. Provider ID: `VIBES`.

## Development

Requires Node.js 22 or newer. No Script-Pro monorepo checkout is needed.

```sh
npm install
npm run typecheck
npm test
npm run build
```

Source is in `src/`; `manifest.json` declares operations, account fields, login authority, approved origins and branding. `src/index.ts` exports the SDK plugin. Provider-side request/response code and its private DTOs are included here. The only shared Script-Pro dependency is the public [generation SDK](https://github.com/2noScript/sp-gen-sdk).

The build emits `dist/vibes-0.2.0.zip` containing `manifest.json` and `plugin.js`. Publish it as a new GitHub release asset and submit its manifest and digest to the [signed catalog](https://github.com/2noScript/sp-gen-plugins). Released version bytes must remain immutable.

## Use in Script-Pro

Open **Settings → Plugins → Generation**, install the plugin, configure its project URL and sign in. Compatible saved browser accounts can be selected explicitly. The host supplies scoped HTTP, generic browser operations and persistent browser profiles; plugin code cannot access Electron or Node APIs.

Tests mock the upstream service and check request construction, result validation and error propagation. They do not establish live sign-in or generation compatibility. The app prefers installed Chrome with an app-managed persistent profile, using Playwright. It uses a separate WebView session only when Chrome cannot start or the user selects WebView. No cookies are copied between engines. Real upstream login acceptance still requires testing with an account.

Current source version: **0.2.0 preview**. Older release archives remain available for pinned tasks.

Provider-specific browser/session checks are implemented in `src/session.ts`. Generation requests use `transport: BROWSER`, so the selected persistent browser profile owns authentication and cookie refresh. App-side provider adapters are not required. Contract 2 is required.
