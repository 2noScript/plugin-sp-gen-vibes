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

Source is in `src/`; `manifest.json` declares operations, account fields, login authority, approved origins and branding. `src/index.ts` exports the SDK plugin. Provider-side request/response code and its private DTOs are included here. The only shared Script-Pro dependency is the public [generation SDK](https://github.com/2noScript/script-pro-generation-sdk).

The build emits `dist/vibes-0.1.2.zip` containing `manifest.json` and `plugin.js`. Publish it as a new GitHub release asset and submit its manifest and digest to the [signed catalog](https://github.com/2noScript/sp-gen-plugins). Released version bytes must remain immutable.

## Use in Script-Pro

Open **Settings → Plugins → Generation**, install the plugin, configure its project URL and sign in. Compatible saved browser accounts can be selected explicitly. The host supplies scoped HTTP, service-session operations and persistent browser profiles; plugin code cannot access Electron or Node APIs.

Tests mock the upstream service and check request construction, result validation and error propagation. They do not establish live sign-in or generation compatibility. Google can reject embedded-browser login; external OAuth callbacks are not implemented by this release.

Current source version: **0.1.2 preview**. Older release archives remain available for pinned tasks.
