# Vibes generation plugin

Downloadable Script-Pro provider package, version 0.1.0 (preview).

Install from **Settings → Plugins → Generation** in Script-Pro. Sign in with your own provider account and configure its project URL. Google Flow supports Google browser accounts; Vibes supports Meta browser accounts. Existing service sessions can be reused without copying cookies. Service sign-in and consent remain subject to the provider.

This repository distributes the compiled package and its manifest. The archive contains only `manifest.json` and `plugin.js`. Script-Pro verifies the signed catalog and archive digest before running it in a sandbox.

- Provider ID: `VIBES`
- Contract: 1
- SHA-256: `510170c9ae014d615680865d3254a2a962a0c683a4945c4b51dc78adeb857e31`
- [SDK](https://github.com/2noScript/script-pro-generation-sdk)
- [Catalog](https://github.com/2noScript/script-pro-generation-plugins)

Runtime installation, isolation, and shared browser session behavior have automated integration coverage. Live generation with provider accounts is pending verification. No credentials or browser sessions are included.
