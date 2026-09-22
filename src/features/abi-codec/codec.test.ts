import { describe, expect, it } from 'vitest'
import { decodeCall, encodeCall, parseSignature } from './codec'

// 주소 0x...001, amount 1 ether(=10^18 wei)에 대한 ERC-20 transfer 표준 calldata
const TRANSFER_CALLDATA =
  '0xa9059cbb' +
  '0000000000000000000000000000000000000000000000000000000000000001' +
  '0000000000000000000000000000000000000000000000000de0b6b3a7640000'

const TRANSFER_ARGS_JSON =
  '["0x0000000000000000000000000000000000000001", "1000000000000000000"]'

describe('parseSignature', () => {
  it('단축형 시그니처 — `transfer(address,uint256)`', () => {
    const result = parseSignature('transfer(address,uint256)')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.abi.name).toBe('transfer')
      expect(result.value.selector).toBe('0xa9059cbb')
      expect(result.value.canonical).toBe('transfer(address,uint256)')
      expect(result.value.abi.inputs).toHaveLength(2)
      expect(result.value.abi.inputs[0]?.type).toBe('address')
      expect(result.value.abi.inputs[1]?.type).toBe('uint256')
    }
  })

  it('full form — `function transfer(address to, uint256 amount)`', () => {
    const result = parseSignature(
      'function transfer(address to, uint256 amount)',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.selector).toBe('0xa9059cbb')
      expect(result.value.canonical).toBe('transfer(address,uint256)')
    }
  })

  it('무인자 함수 — `totalSupply()`', () => {
    const result = parseSignature('totalSupply()')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.selector).toBe('0x18160ddd')
      expect(result.value.abi.inputs).toHaveLength(0)
    }
  })

  it('빈 입력은 거절', () => {
    expect(parseSignature('').ok).toBe(false)
    expect(parseSignature('   ').ok).toBe(false)
  })

  it('잘못된 시그니처는 친근한 에러 메시지로 거절', () => {
    const result = parseSignature('not-a-signature')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0)
  })

  it('event는 거절 (function만 지원)', () => {
    const result = parseSignature(
      'event Transfer(address indexed,address indexed,uint256)',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/function/)
  })
})

describe('encodeCall — ERC-20 표준 fixture', () => {
  it('transfer(address,uint256) 인코딩이 표준 calldata와 일치', () => {
    const result = encodeCall(
      'transfer(address,uint256)',
      TRANSFER_ARGS_JSON,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.calldata).toBe(TRANSFER_CALLDATA)
      expect(result.selector).toBe('0xa9059cbb')
    }
  })

  it('balanceOf(address) 인코딩', () => {
    const result = encodeCall(
      'balanceOf(address)',
      '["0x0000000000000000000000000000000000000001"]',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.calldata).toBe(
        '0x70a082310000000000000000000000000000000000000000000000000000000000000001',
      )
    }
  })

  it('totalSupply() — 무인자, calldata는 selector뿐', () => {
    const result = encodeCall('totalSupply()', '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.calldata).toBe('0x18160ddd')
    }
  })

  it('무인자 함수에 빈 배열 args도 허용', () => {
    const result = encodeCall('totalSupply()', '[]')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.calldata).toBe('0x18160ddd')
    }
  })

  it('숫자 문자열은 uint256으로 강제 변환 (BigInt 안전)', () => {
    // Number.MAX_SAFE_INTEGER를 넘는 amount
    const huge = '999999999999999999999'
    const result = encodeCall(
      'balanceOf(uint256)',
      `["${huge}"]`,
    )
    expect(result.ok).toBe(true)
  })
})

describe('encodeCall — 에러 케이스', () => {
  it('args JSON 자체가 잘못되면 거절', () => {
    const result = encodeCall(
      'transfer(address,uint256)',
      '{not json',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/JSON/)
  })

  it('args가 배열이 아니면 거절', () => {
    const result = encodeCall(
      'transfer(address,uint256)',
      '{"to":"0x...","amount":1}',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/배열/)
  })

  it('인자 개수가 다르면 거절', () => {
    const result = encodeCall(
      'transfer(address,uint256)',
      '["0x0000000000000000000000000000000000000001"]',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/개수 불일치/)
  })

  it('타입 불일치는 viem 메시지를 노출', () => {
    const result = encodeCall(
      'transfer(address,uint256)',
      '["not-an-address", "100"]',
    )
    expect(result.ok).toBe(false)
  })

  it('빈 시그니처는 거절', () => {
    const result = encodeCall('', '[]')
    expect(result.ok).toBe(false)
  })
})

describe('decodeCall — 표준 fixture', () => {
  it('transfer calldata 디코딩', () => {
    const result = decodeCall('transfer(address,uint256)', TRANSFER_CALLDATA)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.args).toHaveLength(2)
      expect(result.args[0]).toBe('0x0000000000000000000000000000000000000001')
      expect(result.args[1]).toBe(1000000000000000000n)
    }
  })

  it('디코딩 결과의 JSON 표현은 BigInt-safe', () => {
    const result = decodeCall('transfer(address,uint256)', TRANSFER_CALLDATA)
    expect(result.ok).toBe(true)
    if (result.ok) {
      // JSON.parse 가능해야 함 (bigint가 toString된 후라야)
      expect(() => JSON.parse(result.argsJson)).not.toThrow()
      expect(result.argsJson).toContain('"1000000000000000000"')
    }
  })

  it('totalSupply() — selector만 있는 calldata 디코딩', () => {
    const result = decodeCall('totalSupply()', '0x18160ddd')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.args).toEqual([])
      expect(result.argsJson).toBe('[]')
    }
  })

  it('selector 불일치는 viem 에러로 노출', () => {
    // transfer 시그니처에 balanceOf calldata를 넣음
    const result = decodeCall(
      'transfer(address,uint256)',
      '0x70a082310000000000000000000000000000000000000000000000000000000000000001',
    )
    expect(result.ok).toBe(false)
  })

  it('잘못된 hex calldata는 거절', () => {
    expect(decodeCall('transfer(address,uint256)', 'deadbeef').ok).toBe(false)
    expect(decodeCall('transfer(address,uint256)', '0xZZ').ok).toBe(false)
    expect(decodeCall('transfer(address,uint256)', '0xabc').ok).toBe(false) // 홀수
  })
})

describe('encode ↔ decode 라운드 트립', () => {
  const cases: Array<[string, string]> = [
    [
      'transfer(address,uint256)',
      '["0x0000000000000000000000000000000000000001", "1000000000000000000"]',
    ],
    ['balanceOf(address)', '["0x0000000000000000000000000000000000000001"]'],
    ['totalSupply()', '[]'],
    [
      'approve(address,uint256)',
      '["0x000000000000000000000000000000000000000a", "0"]',
    ],
  ]

  for (const [signature, argsJson] of cases) {
    it(`${signature} 라운드 트립`, () => {
      const enc = encodeCall(signature, argsJson)
      expect(enc.ok).toBe(true)
      if (!enc.ok) return

      const dec = decodeCall(signature, enc.calldata)
      expect(dec.ok).toBe(true)
      if (!dec.ok) return

      // 다시 인코딩해도 calldata가 동일
      const reEnc = encodeCall(signature, dec.argsJson)
      expect(reEnc.ok).toBe(true)
      if (reEnc.ok) expect(reEnc.calldata).toBe(enc.calldata)
    })
  }
})
