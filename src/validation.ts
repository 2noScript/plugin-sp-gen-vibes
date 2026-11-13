import type { Connection } from './types'
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
  GenerationVideoResponse
} from './types'

export interface IGenerationService {
  generateCharacter(profile: Connection, payload: GenerationCharacterPayload): Promise<GenerationCharacterResponse>
  generateProp(profile: Connection, payload: GenerationPropPayload): Promise<GenerationPropResponse>
  generateEnvironment(profile: Connection, payload: GenerationEnvironmentPayload): Promise<GenerationEnvironmentResponse>
  generateImage(profile: Connection, payload: GenerationImagePayload): Promise<GenerationImageResponse>
  generateVideo(profile: Connection, payload: GenerationVideoPayload): Promise<GenerationVideoResponse>
}

export abstract class BaseGenerationService implements IGenerationService {
  abstract generateCharacter(profile: Connection, payload: GenerationCharacterPayload): Promise<GenerationCharacterResponse>
  abstract generateProp(profile: Connection, payload: GenerationPropPayload): Promise<GenerationPropResponse>
  abstract generateEnvironment(profile: Connection, payload: GenerationEnvironmentPayload): Promise<GenerationEnvironmentResponse>
  abstract generateImage(profile: Connection, payload: GenerationImagePayload): Promise<GenerationImageResponse>
  abstract generateVideo(profile: Connection, payload: GenerationVideoPayload): Promise<GenerationVideoResponse>

  protected validateBasePayload(payload: { providerId?: string; prompt?: string; model?: string }, providerName: string, actionName: string): void {
    if (!payload.providerId) {
      throw new Error(`Missing required 'providerId' for ${providerName} ${actionName}`)
    }
    if (!payload.prompt) {
      throw new Error(`Missing required 'prompt' for ${providerName} ${actionName}`)
    }
    if (!payload.model) {
      throw new Error(`Missing required 'model' for ${providerName} ${actionName}`)
    }
  }

  protected validateEnvironmentPayload(payload: GenerationEnvironmentPayload, providerName: string): void {
    this.validateBasePayload(payload, providerName, 'environment generation')
    if (!payload.ratio) {
      throw new Error(`Missing required 'ratio' for ${providerName} environment generation`)
    }
  }

  protected validateImagePayload(payload: GenerationImagePayload, providerName: string): void {
    this.validateBasePayload(payload, providerName, 'image generation')
    if (!payload.ratio) {
      throw new Error(`Missing required 'ratio' for ${providerName} image generation`)
    }
  }

  protected validateVideoPayload(payload: GenerationVideoPayload, providerName: string): void {
    this.validateBasePayload(payload, providerName, 'video generation')
    if (!payload.ratio) {
      throw new Error(`Missing required 'ratio' for ${providerName} video generation`)
    }
    if (!payload.startFrameUrl) {
      throw new Error(`Missing required 'startFrameUrl' for ${providerName} video generation`)
    }
  }
}
