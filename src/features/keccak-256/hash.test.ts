import { describe, expect, it } from 'vitest'
import { computeKeccak, isValidHex } from './hash'

describe('computeKeccak — 표준 fixture (text mode)', () => {
  it('keccak256("") = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 (empty hash)', () => {
    const result = computeKeccak('', 'text')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.hash).toBe(
        '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
      )
      expect(result.byteLength).toBe(0)
    }
  })

  it('keccak256("abc")', () => {
    const result = computeKeccak('abc', 'text')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.hash).toBe(
        '0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
      )
      expect(result.byteLength).toBe(3)
    }
  })

  it('keccak256("hello")', () => {
    const result = computeKeccak('hello', 'text')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.hash).toBe(
        '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
      )
    }
  })
})

describe('computeKeccak — ERC-20 function selector fixture', () => {
  // 표준 ERC-20 selector — 어느 EVM 체인에서도 검증 가능
  const cases: Array<[string, `0x${string}`]> = [
    ['transfer(address,uint256)', '0xa9059cbb'],
    ['balanceOf(address)', '0x70a08231'],
    ['approve(address,uint256)', '0x095ea7b3'],
    ['totalSupply()', '0x18160ddd'],
    ['transferFrom(address,address,uint256)', '0x23b872dd'],
  ]

  for (const [signature, expectedSelector] of cases) {
    it(`keccak256("${signature}")[:4] = ${expectedSelector}`, () => {
      const result = computeKeccak(signature, 'text')
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.selector).toBe(expectedSelector)
    })
  }
})

describe('computeKeccak — hex mode', () => {
  it('빈 hex "0x" = 빈 텍스트와 동일한 해시', () => {
    const fromHex = computeKeccak('0x', 'hex')
    const fromText = computeKeccak('', 'text')
    expect(fromHex.ok).toBe(true)
    expect(fromText.ok).toBe(true)
    if (fromHex.ok && fromText.ok) {
      expect(fromHex.hash).toBe(fromText.hash)
      expect(fromHex.byteLength).toBe(0)
    }
  })

  it('hex "0x616263" (= "abc" UTF-8) = text "abc"와 동일한 해시', () => {
    const fromHex = computeKeccak('0x616263', 'hex')
    const fromText = computeKeccak('abc', 'text')
    expect(fromHex.ok).toBe(true)
    expect(fromText.ok).toBe(true)
    if (fromHex.ok && fromText.ok) {
      expect(fromHex.hash).toBe(fromText.hash)
      expect(fromHex.byteLength).toBe(3)
    }
  })

  it('대문자 hex도 처리', () => {
    const lower = computeKeccak('0xdeadbeef', 'hex')
    const upper = computeKeccak('0xDEADBEEF', 'hex')
    expect(lower.ok).toBe(true)
    expect(upper.ok).toBe(true)
    if (lower.ok && upper.ok) expect(lower.hash).toBe(upper.hash)
  })

  it('앞뒤 공백은 trim 후 처리', () => {
    const padded = computeKeccak('   0xdeadbeef   ', 'hex')
    const clean = computeKeccak('0xdeadbeef', 'hex')
    expect(padded.ok).toBe(true)
    expect(clean.ok).toBe(true)
    if (padded.ok && clean.ok) expect(padded.hash).toBe(clean.hash)
  })
})

describe('computeKeccak — hex 입력 검증 실패', () => {
  it('0x 접두가 없으면 invalid-hex', () => {
    expect(computeKeccak('deadbeef', 'hex')).toEqual({
      ok: false,
      reason: 'invalid-hex',
    })
  })

  it('홀수 길이 hex는 invalid-hex', () => {
    expect(computeKeccak('0xabc', 'hex')).toEqual({
      ok: false,
      reason: 'invalid-hex',
    })
  })

  it('비-hex 문자가 섞이면 invalid-hex', () => {
    expect(computeKeccak('0xzz', 'hex')).toEqual({
      ok: false,
      reason: 'invalid-hex',
    })
    expect(computeKeccak('0xgg', 'hex')).toEqual({
      ok: false,
      reason: 'invalid-hex',
    })
  })

  it('완전히 빈 문자열도 invalid-hex (최소 "0x" 필요)', () => {
    expect(computeKeccak('', 'hex')).toEqual({
      ok: false,
      reason: 'invalid-hex',
    })
  })
})

describe('isValidHex', () => {
  it('유효 케이스', () => {
    expect(isValidHex('0x')).toBe(true)
    expect(isValidHex('0xab')).toBe(true)
    expect(isValidHex('0xABCD')).toBe(true)
    expect(isValidHex('0xdeadbeef')).toBe(true)
    expect(isValidHex('  0xab  ')).toBe(true)
  })

  it('무효 케이스', () => {
    expect(isValidHex('')).toBe(false)
    expect(isValidHex('ab')).toBe(false)
    expect(isValidHex('0xa')).toBe(false)
    expect(isValidHex('0xzz')).toBe(false)
    expect(isValidHex('0X12')).toBe(false) // 대문자 X는 거부 (일관성 위해)
  })
})

describe('computeKeccak — 항상 32바이트 해시 반환', () => {
  const inputs = ['', 'a', 'long string of text 🚀 한글', 'a'.repeat(10000)]
  for (const input of inputs) {
    it(`text "${input.slice(0, 20)}${input.length > 20 ? '…' : ''}" → 32바이트`, () => {
      const result = computeKeccak(input, 'text')
      expect(result.ok).toBe(true)
      if (result.ok) {
        // 0x + 64 hex chars
        expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/)
        expect(result.selector).toMatch(/^0x[0-9a-f]{8}$/)
      }
    })
  }
})
