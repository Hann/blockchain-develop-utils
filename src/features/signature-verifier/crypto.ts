import {
  hashMessage,
  hashTypedData,
  parseSignature,
  recoverAddress,
  recoverMessageAddress,
  recoverTypedDataAddress,
  serializeSignature,
} from 'viem'
import { privateKeyToAccount, sign } from 'viem/accounts'
import type { TypedDataDomain } from 'viem'

export type Hex = `0x${string}`
export type SignMode = 'eip712' | 'personalSign' | 'digest'

export type SignSuccess = {
  signature: Hex
  signer: Hex
  digest: Hex
  r: Hex
  s: Hex
  v: number
}

export type RecoverSuccess = {
  signer: Hex
  digest: Hex
  r: Hex
  s: Hex
  v: number
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/
const SIGNATURE_PATTERN = /^0x[0-9a-fA-F]{130}$/
const HASH32_PATTERN = /^0x[0-9a-fA-F]{64}$/

export function isPrivateKey(input: string): boolean {
  return PRIVATE_KEY_PATTERN.test(input.trim())
}

export function isSignatureHex(input: string): boolean {
  return SIGNATURE_PATTERN.test(input.trim())
}

export function isHash32(input: string): boolean {
  return HASH32_PATTERN.test(input.trim())
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.split('\n')[0]?.trim() || err.message
  }
  return String(err)
}

type TypedData = {
  domain: TypedDataDomain
  types: Record<string, ReadonlyArray<{ name: string; type: string }>>
  primaryType: string
  message: Record<string, unknown>
}

function parseTypedDataJson(input: string): Result<TypedData> {
  const trimmed = input.trim()
  if (trimmed === '') {
    return { ok: false, error: 'typed data를 입력하세요' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: 'JSON 파싱 실패' }
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return { ok: false, error: 'typed data는 객체여야 합니다' }
  }
  const obj = parsed as Record<string, unknown>
  if (
    typeof obj.domain !== 'object' ||
    obj.domain === null ||
    typeof obj.types !== 'object' ||
    obj.types === null ||
    typeof obj.primaryType !== 'string' ||
    typeof obj.message !== 'object' ||
    obj.message === null
  ) {
    return {
      ok: false,
      error: 'domain / types / primaryType / message 필드가 필요합니다',
    }
  }
  return { ok: true, value: obj as unknown as TypedData }
}

function splitSignature(sig: Hex): { r: Hex; s: Hex; v: number } {
  const parsed = parseSignature(sig)
  const v = parsed.v !== undefined ? Number(parsed.v) : 27 + (parsed.yParity ?? 0)
  return { r: parsed.r, s: parsed.s, v }
}

// === Sign ===

export async function signEip712(
  privateKey: string,
  typedDataJson: string,
): Promise<Result<SignSuccess>> {
  if (!isPrivateKey(privateKey)) {
    return { ok: false, error: '개인키는 0x + 64자 hex여야 합니다' }
  }
  const typed = parseTypedDataJson(typedDataJson)
  if (!typed.ok) return { ok: false, error: typed.error }

  try {
    const account = privateKeyToAccount(privateKey.trim() as Hex)
    const signature = await account.signTypedData(typed.value)
    const digest = hashTypedData(typed.value)
    const { r, s, v } = splitSignature(signature)
    return {
      ok: true,
      value: {
        signature,
        signer: account.address,
        digest,
        r,
        s,
        v,
      },
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

export async function signPersonal(
  privateKey: string,
  message: string,
): Promise<Result<SignSuccess>> {
  if (!isPrivateKey(privateKey)) {
    return { ok: false, error: '개인키는 0x + 64자 hex여야 합니다' }
  }
  try {
    const account = privateKeyToAccount(privateKey.trim() as Hex)
    const signature = await account.signMessage({ message })
    const digest = hashMessage(message)
    const { r, s, v } = splitSignature(signature)
    return {
      ok: true,
      value: {
        signature,
        signer: account.address,
        digest,
        r,
        s,
        v,
      },
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

export async function signDigest(
  privateKey: string,
  digest: string,
): Promise<Result<SignSuccess>> {
  if (!isPrivateKey(privateKey)) {
    return { ok: false, error: '개인키는 0x + 64자 hex여야 합니다' }
  }
  const trimmedDigest = digest.trim()
  if (!isHash32(trimmedDigest)) {
    return { ok: false, error: 'digest는 0x + 64자 hex (32 bytes)여야 합니다' }
  }
  try {
    const account = privateKeyToAccount(privateKey.trim() as Hex)
    const sigObject = await sign({
      hash: trimmedDigest as Hex,
      privateKey: privateKey.trim() as Hex,
    })
    const signature = serializeSignature(sigObject)
    const { r, s, v } = splitSignature(signature)
    return {
      ok: true,
      value: {
        signature,
        signer: account.address,
        digest: trimmedDigest as Hex,
        r,
        s,
        v,
      },
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

// === Recover ===

export async function recoverEip712(
  typedDataJson: string,
  signature: string,
): Promise<Result<RecoverSuccess>> {
  if (!isSignatureHex(signature)) {
    return { ok: false, error: '서명은 0x + 130자 hex여야 합니다' }
  }
  const typed = parseTypedDataJson(typedDataJson)
  if (!typed.ok) return { ok: false, error: typed.error }

  try {
    const sig = signature.trim() as Hex
    const signer = await recoverTypedDataAddress({
      ...typed.value,
      signature: sig,
    })
    const digest = hashTypedData(typed.value)
    const { r, s, v } = splitSignature(sig)
    return { ok: true, value: { signer, digest, r, s, v } }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

export async function recoverPersonal(
  message: string,
  signature: string,
): Promise<Result<RecoverSuccess>> {
  if (!isSignatureHex(signature)) {
    return { ok: false, error: '서명은 0x + 130자 hex여야 합니다' }
  }
  try {
    const sig = signature.trim() as Hex
    const signer = await recoverMessageAddress({ message, signature: sig })
    const digest = hashMessage(message)
    const { r, s, v } = splitSignature(sig)
    return { ok: true, value: { signer, digest, r, s, v } }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

export async function recoverDigest(
  digest: string,
  signature: string,
): Promise<Result<RecoverSuccess>> {
  if (!isSignatureHex(signature)) {
    return { ok: false, error: '서명은 0x + 130자 hex여야 합니다' }
  }
  const trimmedDigest = digest.trim()
  if (!isHash32(trimmedDigest)) {
    return { ok: false, error: 'digest는 0x + 64자 hex (32 bytes)여야 합니다' }
  }
  try {
    const sig = signature.trim() as Hex
    const signer = await recoverAddress({
      hash: trimmedDigest as Hex,
      signature: sig,
    })
    const { r, s, v } = splitSignature(sig)
    return {
      ok: true,
      value: { signer, digest: trimmedDigest as Hex, r, s, v },
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}
