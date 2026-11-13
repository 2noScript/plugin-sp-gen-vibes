import {
  definePlugin,
  defineProvider,
  pluginManifestSchema,
} from "@script-pro/generation-sdk";
import { VibesService } from "./provider";
import { runProvider } from "./adapter";
import { connectionFromHost } from "./connection";
import manifest from "../manifest.json";

const packageManifest = pluginManifestSchema.parse(manifest);

const provider = defineProvider({
  manifest: packageManifest.providers[0],
  async checkConnection(host) {
    try {
      await host.session("vibes.session");
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
      { getMetaSession: () => host.session("vibes.session") },
      (url, options) =>
        host.request({
          url,
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
