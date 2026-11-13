import {
  definePlugin,
  defineProvider,
  pluginManifestSchema,
} from "@script-pro/generation-sdk";
import { VibesService } from "./provider";
import { runProvider } from "./adapter";
import { connectionFromHost } from "./connection";
import manifest from "../manifest.json";
import { ensureVibesSession } from "./session";

const packageManifest = pluginManifestSchema.parse(manifest);

const provider = defineProvider({
  manifest: packageManifest.providers[0],
  async checkConnection(host) {
    try {
      await ensureVibesSession(host);
      return { status: "CONNECTED" };
    } catch {
      return {
        status: "AUTH_REQUIRED",
        message: "Sign in to Vibes to continue",
      };
    }
  },
  async generate(request, host) {
    const profile = connectionFromHost(host);
    const provider = new VibesService(
      { ensureSession: () => ensureVibesSession(host) },
      (url, options) =>
        host.request({
          url,
          transport: "BROWSER",
          proxy: options.proxy,
          method: options.method,
          headers: options.headers,
          body:
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          responseType: "JSON",
        }),
    );
    return { ok: true, media: await runProvider(provider, profile, request) };
  },
});

export default definePlugin({
  manifest: packageManifest,
  providers: [provider],
});
