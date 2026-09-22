import {
  decodeFunctionData,
  encodeFunctionData,
  parseAbiItem,
  toFunctionSelector,
} from 'viem'
import type { AbiFunction } from 'viem'

export type Hex = `0x${string}`

export type ParsedSignature = {
  abi: AbiFunction
  selector: Hex
  /** 정규화된 한 줄 시그니처 — `function name(t1,t2,...)` */
  canonical: string
}

export type ParseResult =
  | { ok: true; value: ParsedSignature }
  | { ok: false; error: string }

export type EncodeResult =
  | { ok: true; calldata: Hex; selector: Hex }
  | { ok: false; error: string }

export type DecodeResult =
  | { ok: true; args: readonly unknown[]; argsJson: string }
  | { ok: false; error: string }

const HEX_PATTERN = /^0x[0-9a-fA-F]*$/

/**
 * 사용자가 입력한 시그니처를 viem이 받는 형태로 정규화.
 * - `transfer(address,uint256)` → `function transfer(address,uint256)`
 * - 이미 `function ...`/`event ...`/`error ...`이면 그대로 통과시켜 viem이 거절하게 함
 */
function normalizeSignature(input: string): string {
  const trimmed = input.trim()
  if (/^(function|event|error|constructor)\s/.test(trimmed)) return trimmed
  return `function ${trimmed}`
}

export function parseSignature(input: string): ParseResult {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: '시그니처를 입력하세요' }

  try {
    const parsed = parseAbiItem(normalizeSignature(trimmed))
    if (parsed.type !== 'function') {
      return {
        ok: false,
        error: `지원하지 않는 타입: ${parsed.type} (function만 지원)`,
      }
    }
    return {
      ok: true,
      value: {
        abi: parsed,
        selector: toFunctionSelector(parsed),
        canonical: canonicalSignature(parsed),
      },
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

function canonicalSignature(abi: AbiFunction): string {
  const types = abi.inputs.map((i) => i.type).join(',')
  return `${abi.name}(${types})`
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const firstLine = err.message.split('\n')[0]?.trim()
    return firstLine || err.message
  }
  return String(err)
}

/**
 * JSON args를 BigInt-safe하게 stringify.
 * viem이 디코딩 결과로 돌려주는 bigint를 사람이 읽을 수 있는 문자열로 표현.
 */
export function stringifyArgs(args: readonly unknown[]): string {
  return JSON.stringify(
    args,
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
    2,
  )
}

export function encodeCall(
  signature: string,
  argsJson: string,
): EncodeResult {
  const parsed = parseSignature(signature)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const { abi, selector } = parsed.value

  // args === '' 이고 inputs 도 비어있으면 무인자 호출
  let args: unknown[]
  if (argsJson.trim() === '') {
    if (abi.inputs.length === 0) {
      args = []
    } else {
      return {
        ok: false,
        error: `${abi.inputs.length}개의 인자가 필요합니다`,
      }
    }
  } else {
    try {
      const parsedJson: unknown = JSON.parse(argsJson)
      if (!Array.isArray(parsedJson)) {
        return { ok: false, error: 'args는 JSON 배열이어야 합니다' }
      }
      args = parsedJson
    } catch {
      return { ok: false, error: 'JSON 파싱 실패' }
    }
  }

  if (args.length !== abi.inputs.length) {
    return {
      ok: false,
      error: `인자 개수 불일치: ${abi.inputs.length}개 필요, ${args.length}개 입력됨`,
    }
  }

  try {
    const calldata = encodeFunctionData({
      abi: [abi],
      functionName: abi.name,
      args: coerceArgs(abi, args),
    })
    return { ok: true, calldata, selector }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}

// JSON으로 들어온 숫자/문자열을 viem이 받아들이는 형태로 변환.
// uintN / intN: string|number → bigint, 그 외 타입은 그대로.
function coerceArgs(abi: AbiFunction, args: unknown[]): unknown[] {
  return args.map((arg, i) => coerceValue(arg, abi.inputs[i]?.type ?? ''))
}

function coerceValue(value: unknown, type: string): unknown {
  if (/^u?int\d*$/.test(type)) {
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(value)
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        return BigInt(value.trim())
      } catch {
        return value
      }
    }
  }
  if (Array.isArray(value) && /\[\d*\]$/.test(type)) {
    const innerType = type.replace(/\[\d*\]$/, '')
    return value.map((v) => coerceValue(v, innerType))
  }
  return value
}

export function decodeCall(
  signature: string,
  calldata: string,
): DecodeResult {
  const parsed = parseSignature(signature)
  if (!parsed.ok) return { ok: false, error: parsed.error }

  const trimmed = calldata.trim()
  if (!HEX_PATTERN.test(trimmed) || trimmed.length % 2 !== 0) {
    return { ok: false, error: '0x 접두 + 짝수 hex character 필요' }
  }

  try {
    const { args } = decodeFunctionData({
      abi: [parsed.value.abi],
      data: trimmed as Hex,
    })
    const argList = (args ?? []) as readonly unknown[]
    return {
      ok: true,
      args: argList,
      argsJson: stringifyArgs(argList),
    }
  } catch (err) {
    return { ok: false, error: friendlyError(err) }
  }
}
