import { hexToBytes, keccak256, stringToBytes } from 'viem'

export type Hex = `0x${string}`
export type InputMode = 'text' | 'hex'

export type HashResult =
  | {
      ok: true
      hash: Hex
      /** 첫 4바이트 — Solidity function selector */
      selector: Hex
      /** 입력 바이트 길이 */
      byteLength: number
    }
  | { ok: false; reason: 'invalid-hex' }

const HEX_PATTERN = /^0x([0-9a-fA-F]{2})*$/

/**
 * 입력이 0x 접두 + 짝수 hex character 인지 검증.
 * 빈 `0x` 도 유효 (empty bytes).
 */
export function isValidHex(input: string): boolean {
  return HEX_PATTERN.test(input.trim())
}

/**
 * UTF-8 텍스트 또는 hex 바이트의 keccak256 해시를 계산.
 *
 * - text: 입력 문자열의 UTF-8 인코딩 바이트를 해시
 * - hex: `0x` 접두 hex string을 바이트로 디코딩 후 해시
 *
 * 항상 32바이트 해시를 반환하고, 첫 4바이트(`selector`)를 함께 제공한다.
 */
export function computeKeccak(input: string, mode: InputMode): HashResult {
  if (mode === 'text') {
    const bytes = stringToBytes(input)
    const hash = keccak256(bytes)
    return {
      ok: true,
      hash,
      selector: hash.slice(0, 10) as Hex,
      byteLength: bytes.length,
    }
  }

  const trimmed = input.trim()
  if (!isValidHex(trimmed)) {
    return { ok: false, reason: 'invalid-hex' }
  }
  const bytes = hexToBytes(trimmed as Hex)
  const hash = keccak256(bytes)
  return {
    ok: true,
    hash,
    selector: hash.slice(0, 10) as Hex,
    byteLength: bytes.length,
  }
}
