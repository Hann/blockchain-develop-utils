import { describe, expect, it } from 'vitest'
import {
  UNIT_DECIMALS,
  formatAmount,
  isValidDecimals,
  parseAmount,
} from './units'

describe('parseAmount — 표준 ETH 단위 fixture', () => {
  it('1 ether = 10^18 wei', () => {
    const result = parseAmount('1', UNIT_DECIMALS.ether)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(10n ** 18n)
  })

  it('1 gwei = 10^9 wei', () => {
    const result = parseAmount('1', UNIT_DECIMALS.gwei)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(10n ** 9n)
  })

  it('1 wei = 1 wei', () => {
    const result = parseAmount('1', UNIT_DECIMALS.wei)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(1n)
  })

  it('0.5 ether = 5 × 10^17 wei', () => {
    const result = parseAmount('0.5', UNIT_DECIMALS.ether)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(5n * 10n ** 17n)
  })

  it('21 gwei × 1 = 21 × 10^9 wei (전형적 L1 gas price)', () => {
    const result = parseAmount('21', UNIT_DECIMALS.gwei)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(21n * 10n ** 9n)
  })

  it('Number.MAX_SAFE_INTEGER를 초과하는 값도 정확히 처리', () => {
    const huge = '999999999999999999999' // 10^21 - 1
    const result = parseAmount(huge, UNIT_DECIMALS.wei)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(999999999999999999999n)
  })
})

describe('parseAmount — 입력 검증', () => {
  it('빈 문자열은 empty', () => {
    expect(parseAmount('', 18)).toEqual({ ok: false, reason: 'empty' })
    expect(parseAmount('   ', 18)).toEqual({ ok: false, reason: 'empty' })
  })

  it('공백은 trim 후 처리', () => {
    const result = parseAmount('  1.5  ', 18)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.wei).toBe(15n * 10n ** 17n)
  })

  it('음수는 negative', () => {
    expect(parseAmount('-1', 18)).toEqual({ ok: false, reason: 'negative' })
    expect(parseAmount('-0.5', 18)).toEqual({ ok: false, reason: 'negative' })
  })

  it('문자가 섞이면 invalid', () => {
    expect(parseAmount('abc', 18)).toEqual({ ok: false, reason: 'invalid' })
    expect(parseAmount('1a', 18)).toEqual({ ok: false, reason: 'invalid' })
    expect(parseAmount('1 ether', 18)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('소수점 두 개는 invalid', () => {
    expect(parseAmount('1.2.3', 18)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('지수 표기는 invalid (정확도를 위해 거부)', () => {
    expect(parseAmount('1e18', 0)).toEqual({ ok: false, reason: 'invalid' })
    expect(parseAmount('1.5e3', 18)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('+ 부호 prefix는 invalid', () => {
    expect(parseAmount('+1', 18)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('wei에 소수점 입력은 invalid (정수만 허용)', () => {
    expect(parseAmount('0.5', UNIT_DECIMALS.wei)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('decimals 초과 정밀도는 invalid', () => {
    // gwei는 9자리까지 — 10자리 소수는 invalid
    expect(parseAmount('1.1234567890', UNIT_DECIMALS.gwei)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})

describe('formatAmount — wei → 단위별 문자열', () => {
  it('10^18 wei → "1" (ether)', () => {
    expect(formatAmount(10n ** 18n, UNIT_DECIMALS.ether)).toBe('1')
  })

  it('10^9 wei → "1" (gwei)', () => {
    expect(formatAmount(10n ** 9n, UNIT_DECIMALS.gwei)).toBe('1')
  })

  it('1 wei → "0.000000000000000001" (ether, 정밀 표현)', () => {
    expect(formatAmount(1n, UNIT_DECIMALS.ether)).toBe(
      '0.000000000000000001',
    )
  })

  it('1500000000 wei → "1.5" (gwei)', () => {
    expect(formatAmount(1_500_000_000n, UNIT_DECIMALS.gwei)).toBe('1.5')
  })

  it('0n → "0"', () => {
    expect(formatAmount(0n, UNIT_DECIMALS.ether)).toBe('0')
    expect(formatAmount(0n, UNIT_DECIMALS.gwei)).toBe('0')
    expect(formatAmount(0n, UNIT_DECIMALS.wei)).toBe('0')
  })
})

describe('parseAmount ↔ formatAmount 라운드 트립', () => {
  const cases: Array<[string, number]> = [
    ['0', 18],
    ['1', 18],
    ['1.5', 18],
    ['0.000000000000000001', 18],
    ['21', 9],
    ['999999999999999999999', 0],
  ]

  for (const [input, decimals] of cases) {
    it(`"${input}" @ ${decimals} decimals 라운드 트립 보존`, () => {
      const parsed = parseAmount(input, decimals)
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(formatAmount(parsed.wei, decimals)).toBe(input)
      }
    })
  }
})

describe('isValidDecimals', () => {
  it('0 이상 77 이하 정수만 허용', () => {
    expect(isValidDecimals(0)).toBe(true)
    expect(isValidDecimals(18)).toBe(true)
    expect(isValidDecimals(77)).toBe(true)
    expect(isValidDecimals(-1)).toBe(false)
    expect(isValidDecimals(78)).toBe(false)
    expect(isValidDecimals(1.5)).toBe(false)
    expect(isValidDecimals(Number.NaN)).toBe(false)
  })
})
