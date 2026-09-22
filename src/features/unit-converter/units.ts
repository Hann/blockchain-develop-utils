import { formatUnits, parseUnits } from 'viem'

export type Unit = 'wei' | 'gwei' | 'ether'

export const UNITS: readonly Unit[] = ['wei', 'gwei', 'ether'] as const

export const UNIT_DECIMALS: Record<Unit, number> = {
  wei: 0,
  gwei: 9,
  ether: 18,
}

export const UNIT_LABEL: Record<Unit, string> = {
  wei: 'wei',
  gwei: 'gwei (10⁹ wei)',
  ether: 'ether (10¹⁸ wei)',
}

export type ParseResult =
  | { ok: true; wei: bigint }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' }

/**
 * 사람이 입력한 문자열(예: "1.5")을 wei 단위 bigint로 변환.
 *
 * - 빈 문자열은 `empty`로 구분 (필드가 비어있는 상태)
 * - 음수, NaN, 다중 소수점, decimals 이하 정밀도 초과는 `invalid`
 * - 결과는 항상 0 이상
 */
export function parseAmount(input: string, decimals: number): ParseResult {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, reason: 'empty' }
  if (trimmed.startsWith('-')) return { ok: false, reason: 'negative' }
  // 숫자와 한 개의 소수점만 허용 (지수 표기 거부 — wei는 정확해야 함)
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed)
  if (!match) return { ok: false, reason: 'invalid' }
  // decimals 초과 정밀도는 silent truncation 대신 거부
  const fractional = match[2] ?? ''
  if (fractional.length > decimals) return { ok: false, reason: 'invalid' }

  try {
    const wei = parseUnits(trimmed, decimals)
    if (wei < 0n) return { ok: false, reason: 'negative' }
    return { ok: true, wei }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

/**
 * wei bigint를 지정한 decimals 단위의 문자열로 변환.
 * 항상 정확한 표현 — 표시 자릿수 자르기 없음.
 */
export function formatAmount(wei: bigint, decimals: number): string {
  return formatUnits(wei, decimals)
}

export function isValidDecimals(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 77
}
