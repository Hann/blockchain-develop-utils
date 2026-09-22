import { describe, expect, it } from 'vitest'
import {
  DERIVATION_PATH,
  keyPairsToCsv,
  keyPairsToJson,
  serializeKeyPairs,
} from './export'
import type { Hex, KeyPair } from './types'

function makeKeyPair(seed: string, overrides: Partial<KeyPair> = {}): KeyPair {
  return {
    id: `id-${seed}`,
    mnemonic: `${seed} word two three four five six seven eight nine ten eleven`,
    privateKey: `0x${seed.repeat(64).slice(0, 64)}` as Hex,
    address: `0x${seed.repeat(40).slice(0, 40)}` as Hex,
    ...overrides,
  }
}

describe('keyPairsToJson', () => {
  it('빈 배열은 "[]" 반환', () => {
    expect(keyPairsToJson([])).toBe('[]')
  })

  it('address/privateKey/mnemonic/derivationPath만 직렬화하고 id는 제외', () => {
    const json = keyPairsToJson([makeKeyPair('a')])
    const parsed = JSON.parse(json) as Record<string, unknown>[]

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({
      address: `0x${'a'.repeat(40)}`,
      privateKey: `0x${'a'.repeat(64)}`,
      mnemonic: 'a word two three four five six seven eight nine ten eleven',
      derivationPath: DERIVATION_PATH,
    })
    expect(parsed[0]).not.toHaveProperty('id')
  })

  it('여러 항목을 순서대로 직렬화', () => {
    const json = keyPairsToJson([makeKeyPair('a'), makeKeyPair('b')])
    const parsed = JSON.parse(json) as { address: string }[]
    expect(parsed.map((r) => r.address)).toEqual([
      `0x${'a'.repeat(40)}`,
      `0x${'b'.repeat(40)}`,
    ])
  })
})

describe('keyPairsToCsv', () => {
  it('빈 배열은 헤더만 반환', () => {
    expect(keyPairsToCsv([])).toBe(
      'index,address,privateKey,mnemonic,derivationPath',
    )
  })

  it('헤더 + 1-based index 행을 CRLF로 구분', () => {
    const csv = keyPairsToCsv([makeKeyPair('a'), makeKeyPair('b')])
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('index,address,privateKey,mnemonic,derivationPath')
    expect(lines[1]).toBe(
      `1,0x${'a'.repeat(40)},0x${'a'.repeat(64)},a word two three four five six seven eight nine ten eleven,${DERIVATION_PATH}`,
    )
    expect(lines[2].startsWith('2,')).toBe(true)
    expect(lines).toHaveLength(3)
  })

  it('쉼표가 포함된 값은 따옴표로 감쌈', () => {
    const csv = keyPairsToCsv([makeKeyPair('x', { mnemonic: 'alpha, bravo' })])
    expect(csv.split('\r\n')[1]).toContain('"alpha, bravo"')
  })

  it('따옴표가 포함된 값은 이중 따옴표로 이스케이프', () => {
    const csv = keyPairsToCsv([makeKeyPair('x', { mnemonic: 'say "hi"' })])
    expect(csv.split('\r\n')[1]).toContain('"say ""hi"""')
  })

  it('개행이 포함된 값도 따옴표로 감쌈', () => {
    const csv = keyPairsToCsv([makeKeyPair('x', { mnemonic: 'line1\nline2' })])
    expect(csv.split('\r\n')[1]).toContain('"line1\nline2"')
  })
})

describe('serializeKeyPairs', () => {
  it('format에 따라 json/csv 직렬화로 위임', () => {
    const pairs = [makeKeyPair('a')]
    expect(serializeKeyPairs(pairs, 'json')).toBe(keyPairsToJson(pairs))
    expect(serializeKeyPairs(pairs, 'csv')).toBe(keyPairsToCsv(pairs))
  })
})
