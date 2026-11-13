import type { PluginHost } from "@script-pro/generation-sdk";

export async function ensureVibesSession(host: PluginHost): Promise<void> {
  const cookies = await host.session<{ name: string; value: string }[]>(
    "browser.cookies",
    ["https://vibes.ai/"],
  );
  const connected = cookies.some(({ name, value }) => name === "meta_session" && value);
  if (!connected) throw new Error("Sign in to Vibes first");
}
