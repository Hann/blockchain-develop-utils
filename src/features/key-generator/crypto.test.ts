import { mnemonicToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import {
  generateKeyPair,
  generateKeyPairs,
  maskMnemonic,
  maskPrivateKey,
  shortenAddress,
} from './crypto'

describe('maskPrivateKey', () => {
  it('빈 문자열은 그대로 반환', () => {
    expect(maskPrivateKey('')).toBe('')
  })

  it('12자 이하 입력은 마스킹하지 않고 그대로 반환', () => {
    expect(maskPrivateKey('0x123')).toBe('0x123')
    expect(maskPrivateKey('0x1234567890')).toBe('0x1234567890')
  })

  it('12자 초과는 앞 6자 + … + 뒤 4자 형식으로 마스킹', () => {
    expect(maskPrivateKey('0x1234567890abcdef')).toBe('0x1234…cdef')
  })

  it('실제 64바이트 hex private key 마스킹', () => {
    const pk = `0x${'a'.repeat(64)}`
    expect(maskPrivateKey(pk)).toBe('0xaaaa…aaaa')
  })

  it('마스킹 결과는 항상 6 + 1 + 4 = 11자', () => {
    const pk = `0x${'1234567890'.repeat(7)}` // 72 chars
    const masked = maskPrivateKey(pk)
    expect(masked).toHaveLength(11)
    expect(masked.startsWith('0x1234')).toBe(true)
  })
})

describe('shortenAddress', () => {
  it('빈 문자열은 그대로 반환', () => {
    expect(shortenAddress('')).toBe('')
  })

  it('12자 이하 입력은 그대로 반환', () => {
    expect(shortenAddress('0xabcdefABCD')).toBe('0xabcdefABCD')
  })

  it('표준 EVM 주소를 앞 6자 + … + 뒤 4자로 축약', () => {
    const addr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    expect(shortenAddress(addr)).toBe('0x71C7…976F')
  })

  it('소문자 주소도 정상 축약', () => {
    expect(shortenAddress(`0x${'b'.repeat(40)}`)).toBe('0xbbbb…bbbb')
  })
})

describe('maskMnemonic', () => {
  it('빈 문자열은 그대로 반환', () => {
    expect(maskMnemonic('')).toBe('')
    expect(maskMnemonic('   ')).toBe('')
  })

  it('단어 개수만큼 점 그룹으로 마스킹 (단어 내용 비노출)', () => {
    expect(maskMnemonic('alpha bravo charlie')).toBe('•••• •••• ••••')
  })

  it('12단어 니모닉은 점 그룹 12개', () => {
    const mnemonic = Array.from({ length: 12 }, (_, i) => `word${i}`).join(' ')
    const masked = maskMnemonic(mnemonic)
    expect(masked.split(' ')).toHaveLength(12)
    expect(masked).not.toContain('word')
  })

  it('단어 사이 불규칙한 공백도 정규화', () => {
    expect(maskMnemonic('  alpha   bravo ')).toBe('•••• ••••')
  })
})

describe('generateKeyPair', () => {
  it('id, mnemonic, privateKey, address 필드를 가진 객체 반환', () => {
    const kp = generateKeyPair()
    expect(typeof kp.id).toBe('string')
    expect(kp.id.length).toBeGreaterThan(0)
    expect(typeof kp.mnemonic).toBe('string')
    expect(typeof kp.privateKey).toBe('string')
    expect(typeof kp.address).toBe('string')
  })

  it('mnemonic은 공백으로 구분된 12개 단어', () => {
    const kp = generateKeyPair()
    expect(kp.mnemonic.trim().split(/\s+/)).toHaveLength(12)
  })

  it('mnemonic에서 m/44_/60_/0_/0/0 경로로 파생한 주소와 일치', () => {
    const kp = generateKeyPair()
    const derived = mnemonicToAccount(kp.mnemonic).address
    expect(kp.address).toBe(derived)
  })

  it('privateKey는 0x + 64자 hex 형식', () => {
    const kp = generateKeyPair()
    expect(kp.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/)
  })

  it('address는 0x + 40자 hex 형식 (EIP-55 체크섬 포함 가능)', () => {
    const kp = generateKeyPair()
    expect(kp.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('호출할 때마다 서로 다른 키 생성', () => {
    const a = generateKeyPair()
    const b = generateKeyPair()
    expect(a.privateKey).not.toBe(b.privateKey)
    expect(a.address).not.toBe(b.address)
    expect(a.id).not.toBe(b.id)
  })
})

describe('generateKeyPairs', () => {
  it('요청한 개수만큼 키 페어 반환', () => {
    expect(generateKeyPairs(0)).toEqual([])
    expect(generateKeyPairs(1)).toHaveLength(1)
    expect(generateKeyPairs(5)).toHaveLength(5)
  })

  it('생성된 키들은 모두 서로 다른 mnemonic/privateKey/address/id를 가짐', () => {
    const pairs = generateKeyPairs(10)
    const mnemonics = new Set(pairs.map((k) => k.mnemonic))
    const privateKeys = new Set(pairs.map((k) => k.privateKey))
    const addresses = new Set(pairs.map((k) => k.address))
    const ids = new Set(pairs.map((k) => k.id))
    expect(mnemonics.size).toBe(10)
    expect(privateKeys.size).toBe(10)
    expect(addresses.size).toBe(10)
    expect(ids.size).toBe(10)
  })

  it('생성된 모든 키 페어가 형식 요구사항을 만족', () => {
    for (const kp of generateKeyPairs(5)) {
      expect(kp.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/)
      expect(kp.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    }
  })
})
