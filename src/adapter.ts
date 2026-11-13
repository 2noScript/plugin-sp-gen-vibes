import type {
  GenerateRequest,
  GenerateResult,
  GenerationOperation,
  JsonValue,
} from "@script-pro/generation-sdk";
import type { Connection } from "./types";
import type { IGenerationService } from "./validation";
import type { GenerationResponseData } from "./types";

type Media = Extract<GenerateResult, { ok: true }>["media"];

export async function runProvider(
  service: IGenerationService,
  profile: Connection,
  request: GenerateRequest,
): Promise<Media> {
  const { prompt, model, parameters } = request.input;
  const payload = {
    ...parameters,
    prompt,
    model,
    providerId: request.providerId,
    profileId: profile.id,
  };
  let result: GenerationResponseData;
  switch (request.operation) {
    case "IMAGE":
      result = await service.generateImage(
        profile,
        payload as Parameters<IGenerationService["generateImage"]>[1],
      );
      break;
    case "VIDEO":
      result = await service.generateVideo(
        profile,
        payload as Parameters<IGenerationService["generateVideo"]>[1],
      );
      break;
    case "CHARACTER":
      result = await service.generateCharacter(
        profile,
        payload as Parameters<IGenerationService["generateCharacter"]>[1],
      );
      break;
    case "PROP":
      result = await service.generateProp(
        profile,
        payload as Parameters<IGenerationService["generateProp"]>[1],
      );
      break;
    case "ENVIRONMENT":
      result = await service.generateEnvironment(
        profile,
        payload as Parameters<IGenerationService["generateEnvironment"]>[1],
      );
      break;
  }
  return toMediaResult(request.operation, result);
}

function toMediaResult(
  operation: GenerationOperation,
  response: GenerationResponseData,
): Media {
  return {
    kind: operation === "VIDEO" ? "VIDEO" : "IMAGE",
    mimeType: operation === "VIDEO" ? "video/mp4" : "image/png",
    source: { kind: "URL", url: response.url },
    providerRefs: Object.fromEntries(
      Object.entries(response).filter(
        ([key, value]) =>
          [
            "refId",
            "refCharId",
            "refPropId",
            "refEnvId",
            "ingredientId",
            "thumbnailUrl",
          ].includes(key) && typeof value === "string",
      ),
    ),
    metadata: Object.fromEntries(
      Object.entries({ ...response.metadata, seed: response.seed }).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  };
}
