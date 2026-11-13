export type UuidVersion = 'v4' | 'v7'

function getCryptoApi(): Crypto {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi) {
    throw new Error('Secure Web Crypto API (globalThis.crypto) is not available in current environment')
  }
  return cryptoApi
}

/**
 * Generates an RFC-compliant UUID (v4 random or v7 time-ordered).
 * Strictly complies with Zero-Fallback Policy: requires native CSPRNG (Web Crypto API).
 */
export function generateUuid(version: UuidVersion = 'v4'): string {
  const cryptoApi = getCryptoApi()

  if (version === 'v4') {
    return cryptoApi.randomUUID()
  }

  // UUIDv7: 48-bit timestamp ms + 12-bit ver/random + 62-bit var/random (RFC 9562)
  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)

  const timestamp = BigInt(Date.now())
  bytes[0] = Number((timestamp >> 40n) & 0xffn)
  bytes[1] = Number((timestamp >> 32n) & 0xffn)
  bytes[2] = Number((timestamp >> 24n) & 0xffn)
  bytes[3] = Number((timestamp >> 16n) & 0xffn)
  bytes[4] = Number((timestamp >> 8n) & 0xffn)
  bytes[5] = Number(timestamp & 0xffn)

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

