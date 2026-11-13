import type { PluginHost } from "@script-pro/generation-sdk";
import type { Connection } from "./types";

export function connectionFromHost(
  host: PluginHost,
): Connection {
  if (!host.account.id || typeof host.account.fields.projectUrl !== "string") {
    throw new Error("Choose a connected account and enter its project URL");
  }
  return {
    id: host.account.id,
    url: host.account.fields.projectUrl,
  };
}
