import type {
  GenerationOperation,
  PluginHttpRequest,
} from "@script-pro/generation-sdk";

export interface Connection {
  id: string;
  url: string;
}
export interface EntityReference {
  id: string;
  name: string;
  kind: Exclude<GenerationOperation, "IMAGE" | "VIDEO">;
  refId: string;
  refCharId?: string;
  refPropId?: string;
  refEnvId?: string;
}
export type HttpRequestOptions = Pick<
  PluginHttpRequest,
  "method" | "headers"
> & {
  body?: string | Record<string, unknown>;
  proxy?: string;
};
export type ImagePrompt = string;

export interface BaseGenerationPayload {
  providerId: string;
  profileId: string;
  prompt: ImagePrompt;
  model: string;
  seed?: number;
  options?: Record<string, any>;
  proxy?: string;
}

export interface GenerationCharacterPayload extends BaseGenerationPayload {
  ratio: string;
  name?: string;
  imageUrl?: string;
}

export interface GenerationCharacterResponse {
  url: string;
  refId: string;
  refCharId: string;
  ingredientId?: string;
  name?: string;
  seed: number;
  prompt: ImagePrompt;
  metadata?: Record<string, any>;
}

export interface GenerationPropPayload extends BaseGenerationPayload {
  ratio: string;
  name?: string;
  imageUrl?: string;
}

export interface GenerationPropResponse {
  url: string;
  refId: string;
  refPropId: string;
  ingredientId?: string;
  name?: string;
  seed: number;
  prompt: ImagePrompt;
  metadata?: Record<string, any>;
}

export interface GenerationEnvironmentPayload extends BaseGenerationPayload {
  ratio: string;
  name?: string;
  imageUrl?: string;
}

export interface GenerationEnvironmentResponse {
  url: string;
  refId: string;
  refEnvId: string;
  ingredientId?: string;
  name?: string;
  seed: number;
  prompt: ImagePrompt;
  metadata?: Record<string, any>;
}

export interface GenerationImagePayload extends BaseGenerationPayload {
  ratio: string;
  name?: string;
  resolution?: string;
  entities?: EntityReference[];
  refIds?: string[];
  sourceMediaId?: string;
}

export interface GenerationImageResponse {
  url: string;
  refId: string;
  seed: number;
  prompt: ImagePrompt;
  metadata?: Record<string, any>;
}

export interface GenerationVideoPayload extends BaseGenerationPayload {
  refId?: string;
  startFrameUrl: string;
  endFrameUrl?: string;
  ratio: string;
  resolution?: string;
  duration?: number;
}

export interface GenerationVideoResponse {
  url: string;
  thumbnailUrl?: string;
  refId: string;
  seed: number;
  prompt: ImagePrompt;
  metadata?: Record<string, any>;
}

export type GenerationResponseData =
  | GenerationCharacterResponse
  | GenerationPropResponse
  | GenerationEnvironmentResponse
  | GenerationImageResponse
  | GenerationVideoResponse;

export interface IVibesDriver {
  ensureSession(connection: Connection): Promise<void>;
}
