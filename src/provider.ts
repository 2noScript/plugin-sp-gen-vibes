import type { Connection, EntityReference } from "./types";
import type {
  GenerationCharacterPayload,
  GenerationCharacterResponse,
  GenerationPropPayload,
  GenerationPropResponse,
  GenerationEnvironmentPayload,
  GenerationEnvironmentResponse,
  GenerationImagePayload,
  GenerationImageResponse,
  GenerationVideoPayload,
  GenerationVideoResponse,
} from "./types";
import type { IVibesDriver } from "./types";
import type { HttpRequestOptions } from "./types";
import { generateUuid } from "./id";
import { BaseGenerationService } from "./validation";

export class VibesService extends BaseGenerationService {
  constructor(
    private driver: IVibesDriver,
    private requestJson: (
      url: string,
      options: HttpRequestOptions,
    ) => Promise<unknown>,
  ) {
    super();
  }

  private async ensureSession(profile: Connection): Promise<void> {
    return await this.driver.ensureSession(profile);
  }

  private getProjectId(profile: Connection): string {
    if (profile.url) {
      const match = profile.url.match(/\/projects\/([a-zA-Z0-9-]+)/i);
      if (match && match[1]) return match[1];
    }
    return "default";
  }

  private async executeImageBatch(
    profile: Connection,
    params: {
      prompt: string;
      model: string;
      ratio: string;
      resolution?: string;
      seed?: number;
      proxy?: string;
      refIds?: string[];
      entities?: EntityReference[];
      options?: Record<string, any>;
      targetType: "character" | "prop" | "environment" | "image";
      name?: string;
    },
  ): Promise<GenerationImageResponse> {
    await this.ensureSession(profile);
    const projectId = this.getProjectId(profile);
    const proxy = params.proxy;
    const resolution = params.resolution || "720p";

    const config: Record<string, any> = {
      imageModel: params.model,
      promptModel: "gemini-2.5-flash",
      resolution,
      aspectRatio: params.ratio,
      batchVariation: false,
      generationType: "t2i",
      directGeneration: true,
    };

    // Support library ingredients if passed via options or entities
    const ingredients: Array<{
      ingredientId: string;
      ingredientType: "CHARACTER" | "STYLE" | "SETTING";
      name: string;
      imageUrl?: string;
    }> = [];

    if (Array.isArray(params.options?.ingredients)) {
      ingredients.push(...params.options.ingredients);
    }

    // Build createIngredients dynamically without hardcoding types or limits
    const createIngredients: Array<{
      sourceImageEntId: string;
      ingredientType: "CHARACTER" | "STYLE" | "SETTING";
      name: string;
      imageUrl?: string;
    }> = [];

    // 1. Explicit createIngredients from caller options
    if (Array.isArray(params.options?.createIngredients)) {
      createIngredients.push(...params.options.createIngredients);
    }

    // 2. Map domain entities (characters, props, and environments) with exact kind and name
    if (params.entities && params.entities.length > 0) {
      for (const entity of params.entities) {
        const ingType: "CHARACTER" | "STYLE" | "SETTING" =
          entity.kind === "PROP" || entity.kind === "ENVIRONMENT"
            ? "SETTING"
            : "CHARACTER";
        const entRefId = entity.refId;
        if (
          entRefId &&
          !createIngredients.some((i) => i.sourceImageEntId === entRefId)
        ) {
          createIngredients.push({
            sourceImageEntId: entRefId,
            ingredientType: ingType,
            name: entity.name || `Entity_${entity.id}`,
          });
        }
      }
    }

    // 3. Map remaining raw refIds, resolving against entities if available
    if (params.refIds && params.refIds.length > 0) {
      for (let i = 0; i < params.refIds.length; i++) {
        const refId = params.refIds[i];
        const alreadyInCreate = createIngredients.some(
          (item) => item.sourceImageEntId === refId,
        );
        const alreadyInIng = ingredients.some(
          (item) => item.ingredientId === refId,
        );
        if (!alreadyInCreate && !alreadyInIng) {
          const matchedEntity = params.entities?.find(
            (e) => e.refId === refId || e.id === refId,
          );
          const ingType: "CHARACTER" | "STYLE" | "SETTING" = matchedEntity
            ? matchedEntity.kind === "PROP" ||
              matchedEntity.kind === "ENVIRONMENT"
              ? "SETTING"
              : "CHARACTER"
            : "CHARACTER";

          createIngredients.push({
            sourceImageEntId: refId,
            ingredientType: ingType,
            name: matchedEntity?.name || `Ref_${i + 1}`,
          });
        }
      }
    }

    if (ingredients.length > 0) {
      config.ingredients = ingredients;
    }
    if (createIngredients.length > 0) {
      config.createIngredients = createIngredients;
    }

    const batchId = `batch-${generateUuid("v7")}`;
    const batchBody = {
      id: batchId,
      type: "images",
      prompt: params.prompt,
      timestamp: Date.now(),
      isComplete: false,
      config,
      projectId,
      content: [
        {
          id: `${batchId}-content-0`,
          type: "image",
          isLoading: true,
        },
      ],
    };

    // 1. Create Batch
    await this.requestJson("https://vibes.ai/api/generation-batches", {
      method: "POST",
      body: batchBody,
      proxy,
    });

    // 2. Trigger synchronous generation
    const inputConfig: Record<string, any> = {
      imageModel: params.model,
      promptModel: "gemini-2.5-flash",
      resolution,
      aspectRatio: params.ratio,
      generationType: "t2i",
    };
    if (config.createIngredients) {
      inputConfig.createIngredients = config.createIngredients;
    }
    if (config.ingredients) {
      inputConfig.ingredients = config.ingredients;
    }

    const genBody = {
      batchId,
      inputs: [
        {
          type: "variation",
          image_prompt: params.prompt,
          original_prompt: params.prompt,
          config: inputConfig,
        },
      ],
      config,
    };

    const rawResult: any = await this.requestJson(
      "https://vibes.ai/api/generate/images",
      {
        method: "POST",
        body: genBody,
        proxy,
      },
    );
    const item = rawResult?.data?.[0];

    if (!item?.url) {
      throw new Error(
        `Vibes image generation returned no media URL: ${JSON.stringify(rawResult)}`,
      );
    }

    return {
      url: item.url,
      refId: item?.imageEntId || batchId,
      seed: params.seed ?? 0,
      prompt: params.prompt,
      metadata: {
        targetType: params.targetType,
        providerId: "VIBES",
        batchId,
        projectId,
        name: params.name,
      },
    };
  }

  public async generateCharacter(
    profile: Connection,
    payload: GenerationCharacterPayload,
  ): Promise<GenerationCharacterResponse> {
    this.validateBasePayload(payload, "Vibes", "character generation");
    const res = await this.executeImageBatch(profile, {
      prompt: payload.prompt,
      model: payload.model,
      ratio: payload.ratio,
      seed: payload.seed,
      proxy: payload.proxy,
      options: payload.options,
      targetType: "character",
      name: payload.name,
    });

    // Register into Vibes Studio Ingredients Library
    await this.ensureSession(profile);
    const charName = payload.name || `Character_${Date.now()}`;
    let ingredientId: string | undefined;

    try {
      const ingResult: any = await this.requestJson(
        "https://vibes.ai/api/studio/ingredients",
        {
          method: "POST",
          body: {
            name: charName,
            ingredientType: "CHARACTER",
            sourceImageEntId: res.refId,
            imageUrl: res.url,
          },
          proxy: payload.proxy,
        },
      );
      ingredientId = ingResult?.ingredient?.ingredientId;
    } catch {
      // If studio ingredient creation is not enabled on this account tier,
      // res.refId (sourceImageEntId) is used directly in createIngredients
    }

    return {
      url: res.url,
      refId: ingredientId || res.refId,
      refCharId: ingredientId || res.refId,
      ingredientId,
      name: charName,
      seed: res.seed,
      prompt: res.prompt,
      metadata: {
        targetType: "character",
        ingredientType: "CHARACTER",
        ingredientId,
        imageEntId: res.refId,
        providerId: "VIBES",
        model: payload.model,
        ...res.metadata,
      },
    };
  }

  public async generateProp(
    profile: Connection,
    payload: GenerationPropPayload,
  ): Promise<GenerationPropResponse> {
    this.validateBasePayload(payload, "Vibes", "prop generation");
    const res = await this.executeImageBatch(profile, {
      prompt: payload.prompt,
      model: payload.model,
      ratio: payload.ratio,
      seed: payload.seed,
      proxy: payload.proxy,
      options: payload.options,
      targetType: "prop",
      name: payload.name,
    });

    // Register into Vibes Studio Ingredients Library as SETTING if enabled
    await this.ensureSession(profile);
    const propName = payload.name || `Prop_${Date.now()}`;
    let ingredientId: string | undefined;

    try {
      const ingResult: any = await this.requestJson(
        "https://vibes.ai/api/studio/ingredients",
        {
          method: "POST",
          body: {
            name: propName,
            ingredientType: "SETTING",
            sourceImageEntId: res.refId,
            imageUrl: res.url,
          },
          proxy: payload.proxy,
        },
      );
      ingredientId = ingResult?.ingredient?.ingredientId;
    } catch {
      // If studio ingredient creation is not enabled on this account tier,
      // res.refId (sourceImageEntId) is used directly in createIngredients
    }

    const effectivePropId = ingredientId || res.refId;

    return {
      url: res.url,
      refId: res.refId,
      refPropId: effectivePropId,
      ingredientId,
      name: propName,
      seed: res.seed,
      prompt: res.prompt,
      metadata: {
        targetType: "prop",
        ingredientType: "SETTING",
        ingredientId,
        refId: res.refId,
        refPropId: effectivePropId,
        imageEntId: res.refId,
        providerId: "VIBES",
        model: payload.model,
        ...res.metadata,
      },
    };
  }

  public async generateEnvironment(
    profile: Connection,
    payload: GenerationEnvironmentPayload,
  ): Promise<GenerationEnvironmentResponse> {
    this.validateEnvironmentPayload(payload, "Vibes");
    const ratio = payload.ratio || "16:9";
    const res = await this.executeImageBatch(profile, {
      prompt: payload.prompt,
      model: payload.model,
      ratio,
      seed: payload.seed,
      proxy: payload.proxy,
      options: payload.options,
      targetType: "environment",
      name: payload.name,
    });

    // Register into Vibes Studio Ingredients Library as SETTING if enabled
    await this.ensureSession(profile);
    const envName = payload.name || `Environment_${Date.now()}`;
    let ingredientId: string | undefined;

    try {
      const ingResult: any = await this.requestJson(
        "https://vibes.ai/api/studio/ingredients",
        {
          method: "POST",
          body: {
            name: envName,
            ingredientType: "SETTING",
            sourceImageEntId: res.refId,
            imageUrl: res.url,
          },
          proxy: payload.proxy,
        },
      );
      ingredientId = ingResult?.ingredient?.ingredientId;
    } catch {
      // If studio ingredient creation is not enabled on this account tier,
      // res.refId (sourceImageEntId) is used directly in createIngredients
    }

    const effectiveEnvId = ingredientId || res.refId;

    return {
      url: res.url,
      refId: res.refId,
      refEnvId: effectiveEnvId,
      ingredientId,
      name: envName,
      seed: res.seed,
      prompt: res.prompt,
      metadata: {
        targetType: "environment",
        ingredientType: "SETTING",
        ingredientId,
        refId: res.refId,
        refEnvId: effectiveEnvId,
        imageEntId: res.refId,
        providerId: "VIBES",
        model: payload.model,
        ratio,
        ...res.metadata,
      },
    };
  }

  public async generateImage(
    profile: Connection,
    payload: GenerationImagePayload,
  ): Promise<GenerationImageResponse> {
    this.validateImagePayload(payload, "Vibes");
    const res = await this.executeImageBatch(profile, {
      prompt: payload.prompt,
      model: payload.model,
      ratio: payload.ratio,
      resolution: payload.resolution,
      seed: payload.seed,
      proxy: payload.proxy,
      refIds: payload.refIds,
      entities: payload.entities,
      options: payload.options,
      targetType: "image",
      name: payload.name,
    });
    return {
      url: res.url,
      refId: res.refId,
      seed: res.seed,
      prompt: res.prompt,
      metadata: {
        targetType: "image",
        providerId: "VIBES",
        model: payload.model,
        ...res.metadata,
      },
    };
  }

  public async generateVideo(
    profile: Connection,
    payload: GenerationVideoPayload,
  ): Promise<GenerationVideoResponse> {
    this.validateVideoPayload(payload, "Vibes");

    await this.ensureSession(profile);
    const projectId = this.getProjectId(profile);

    const proxy = payload.proxy;

    const batchId = `batch-${generateUuid("v7")}`;
    const resolution = payload.resolution || "720p";
    const startFrameHandle = {
      image_url: payload.startFrameUrl,
      source: "upload",
    };

    const config: Record<string, any> = {
      videoModel: payload.model,
      resolution,
      aspectRatio: payload.ratio,
      generationType: "i2v",
      directGeneration: true,
      directPromptImageHandle: startFrameHandle,
    };

    const batchBody = {
      id: batchId,
      type: "videos",
      prompt: payload.prompt,
      timestamp: Date.now(),
      isComplete: false,
      config,
      projectId,
      content: [
        {
          id: `${batchId}-content-0`,
          type: "video",
          isLoading: true,
        },
      ],
    };

    // 1. Create Batch for video
    await this.requestJson("https://vibes.ai/api/generation-batches", {
      method: "POST",
      body: batchBody,
      proxy,
    });

    const inputConfig: Record<string, any> = {
      videoModel: payload.model,
      resolution,
      aspectRatio: payload.ratio,
      generationType: "i2v",
      directPromptImageHandle: startFrameHandle,
    };

    const genBody = {
      batchId,
      inputs: [
        {
          type: "prompt",
          value: payload.prompt,
          original_prompt: payload.prompt,
          image_handle: startFrameHandle,
          config: inputConfig,
        },
      ],
      config,
    };

    await this.requestJson("https://vibes.ai/api/generate/videos", {
      method: "POST",
      body: genBody,
      proxy,
    });

    // Poll generation batch until video rendering completes
    const maxPolls = 60;
    let videoUrl = "";
    let thumbnailUrl: string | undefined;
    let mediaId: string = batchId;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      let pollData: any;
      try {
        pollData = await this.requestJson(
          `https://vibes.ai/api/generation-batches/${batchId}`,
          {
            method: "GET",
            proxy,
          },
        );
      } catch {
        continue;
      }
      const batch = pollData?.batch;
      const contentItem = batch?.content?.[0];

      if (contentItem?.videoUrl) {
        videoUrl = contentItem.videoUrl;
        thumbnailUrl = contentItem.imageUrl;
        mediaId =
          contentItem.mediaEntId || contentItem.videoGenEntId || batchId;
        break;
      }

      if (batch?.isComplete) {
        if (batch?.hasError || contentItem?.error) {
          throw new Error(
            `Vibes video generation failed: ${batch?.error || contentItem?.error || "Unknown error"}`,
          );
        }
        if (contentItem?.videoUrl) {
          videoUrl = contentItem.videoUrl;
          thumbnailUrl = contentItem.imageUrl;
          mediaId =
            contentItem.mediaEntId || contentItem.videoGenEntId || batchId;
          break;
        }
      }
    }

    if (!videoUrl) {
      throw new Error(
        `Vibes video generation timed out or returned no video URL for batch ${batchId}`,
      );
    }

    return {
      url: videoUrl,
      thumbnailUrl,
      refId: mediaId,
      seed: payload.seed ?? 0,
      prompt: payload.prompt,
      metadata: {
        providerId: "VIBES",
        batchId,
        projectId,
      },
    };
  }
}
