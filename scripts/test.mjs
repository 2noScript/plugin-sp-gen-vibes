import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { createTestHost, normalizeRequest, validateResult } from '@script-pro/generation-sdk'

const require = createRequire(import.meta.url)
const output = await build({ entryPoints: [new URL('../src/index.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'cjs', write: false })
const module = { exports: {} }
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, module, module.exports)
const provider = module.exports.default.providers[0]
const flow = provider.manifest.providerId === 'FLOW_GOOGLE'
const url = flow ? 'https://flow-content.google/image/fixture-media' : 'https://vibes.ai/fixture.png'
const calls = []
const host = createTestHost({
  account: { id: 'fixture-account', fields: { projectUrl: flow ? 'https://flow.google.com/project/fixture' : 'https://vibes.ai/projects/fixture' } },
  async session(operation) {
    if (operation === 'flow.captcha') return { success: true, token: 'fixture-captcha' }
    if (operation === 'flow.auth') return { at: 'fixture-at', projectId: 'fixture', cookieString: 'fixture=cookie' }
    if (operation === 'vibes.session') return 'fixture-session'
    throw new Error('Unexpected session operation')
  },
  async request(request) {
    calls.push(request)
    if (flow) return JSON.stringify([['wrb.fr', 'ogiZ0b', JSON.stringify([url])]])
    if (request.url.endsWith('/generation-batches')) return {}
    if (request.url.endsWith('/generate/images')) return { data: [{ url, imageEntId: 'fixture-media' }] }
    throw new Error('Unexpected provider endpoint')
  }
})

test('service connection reports authentication state through the host', async () => {
  assert.equal((await provider.checkConnection(host)).status, 'CONNECTED')
  const expired = createTestHost({ async session() { throw new Error('Expired session') } })
  assert.equal((await provider.checkConnection(expired)).status, 'AUTH_REQUIRED')
})

test('image generation builds provider requests and returns a valid SDK result', async () => {
  const request = normalizeRequest(provider.manifest, {
    requestId: 'fixture-request', providerId: provider.manifest.providerId, profileId: 'fixture-account', operation: 'IMAGE',
    input: { prompt: 'A small lighthouse', model: provider.manifest.operations.IMAGE.models[0].id, parameters: { ratio: '1:1', seed: 7 } }
  })
  const result = validateResult(provider.manifest, 'IMAGE', await provider.generate(request, host))
  assert.equal(result.ok, true)
  assert.equal(result.media.source.url, url)
  assert.equal(result.media.providerRefs.refId, 'fixture-media')
  assert.equal(result.media.metadata.seed, 7)
  assert.equal(calls.length, flow ? 1 : 2)
  assert(calls.every(({url}) => provider.manifest.requestOrigins.includes(new URL(url).origin)))
})

test('provider errors propagate without changing service or returning fabricated media', async () => {
  const failing = createTestHost({ ...host, async request() { throw new Error('fixture upstream failure') } })
  const request = normalizeRequest(provider.manifest, {
    requestId: 'fixture-error', providerId: provider.manifest.providerId, profileId: 'fixture-account', operation: 'IMAGE',
    input: { prompt: 'fixture', model: provider.manifest.operations.IMAGE.models[0].id, parameters: { ratio: '1:1' } }
  })
  await assert.rejects(provider.generate(request, failing), /fixture upstream failure/)
})
