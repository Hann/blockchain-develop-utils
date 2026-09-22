import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePinnedKeys } from './storage'
import type { Hex, PinnedKey } from './types'

const STORAGE_KEY = 'blockchain-dev-utils:pinned-keys:v1'

function readStored(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as unknown)
}

const sampleKey: Omit<PinnedKey, 'createdAt'> = {
  id: 'abc-123',
  label: 'Test wallet',
  privateKey: `0x${'a'.repeat(64)}` as Hex,
  address: `0x${'b'.repeat(40)}` as Hex,
}

function makeKey(seed: string, overrides: Partial<PinnedKey> = {}): Omit<PinnedKey, 'createdAt'> {
  return {
    id: `id-${seed}`,
    label: `wallet-${seed}`,
    privateKey: `0x${seed.repeat(64).slice(0, 64)}` as Hex,
    address: `0x${seed.repeat(40).slice(0, 40)}` as Hex,
    ...overrides,
  }
}

describe('usePinnedKeys — 초기 로드', () => {
  it('localStorage가 비어있으면 빈 배열', () => {
    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toEqual([])
  })

  it('유효한 데이터는 그대로 로드', () => {
    const stored: PinnedKey[] = [{ ...sampleKey, createdAt: 1_700_000_000_000 }]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toEqual(stored)
  })

  it('손상된 항목은 거르고 유효한 항목만 로드', () => {
    const mixed = [
      { ...sampleKey, createdAt: 1_700_000_000_000 },
      { id: 'missing-fields', label: 'no keys' },
      { ...sampleKey, id: 'bad-hex', privateKey: 'not-hex', createdAt: 1 },
      { ...sampleKey, id: 'bad-createdAt', createdAt: 'now' },
      { ...sampleKey, id: 'bad-mnemonic', mnemonic: 42, createdAt: 1 },
      null,
      'string',
      42,
    ]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mixed))

    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toHaveLength(1)
    expect(result.current.keys[0].id).toBe(sampleKey.id)
  })

  it('mnemonic 없는 구버전 데이터도 유효하게 로드', () => {
    const legacy = [{ ...sampleKey, createdAt: 1_700_000_000_000 }]
    expect('mnemonic' in legacy[0]).toBe(false)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))

    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toHaveLength(1)
    expect(result.current.keys[0].mnemonic).toBeUndefined()
  })

  it('mnemonic이 있는 항목은 그대로 로드', () => {
    const stored = [
      {
        ...sampleKey,
        mnemonic: 'alpha bravo charlie',
        createdAt: 1_700_000_000_000,
      },
    ]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys[0].mnemonic).toBe('alpha bravo charlie')
  })

  it('JSON 파싱 실패 시 빈 배열로 폴백', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toEqual([])
  })

  it('루트가 배열이 아니면 빈 배열로 폴백', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))
    const { result } = renderHook(() => usePinnedKeys())
    expect(result.current.keys).toEqual([])
  })
})

describe('usePinnedKeys — pin', () => {
  it('새 항목을 추가하고 createdAt 타임스탬프를 부여', () => {
    const before = Date.now()
    const { result } = renderHook(() => usePinnedKeys())

    act(() => {
      result.current.pin(sampleKey)
    })

    const after = Date.now()
    expect(result.current.keys).toHaveLength(1)
    expect(result.current.keys[0]).toMatchObject(sampleKey)
    expect(result.current.keys[0].createdAt).toBeGreaterThanOrEqual(before)
    expect(result.current.keys[0].createdAt).toBeLessThanOrEqual(after)
  })

  it('mnemonic 필드를 보존하여 저장', () => {
    const { result } = renderHook(() => usePinnedKeys())

    act(() => {
      result.current.pin({ ...sampleKey, mnemonic: 'alpha bravo charlie' })
    })

    expect(result.current.keys[0].mnemonic).toBe('alpha bravo charlie')
    const stored = readStored() as PinnedKey[]
    expect(stored[0].mnemonic).toBe('alpha bravo charlie')
  })

  it('최신 항목이 배열 앞에 위치 (prepend)', () => {
    const { result } = renderHook(() => usePinnedKeys())
    const first = makeKey('1')
    const second = makeKey('2')

    act(() => {
      result.current.pin(first)
    })
    act(() => {
      result.current.pin(second)
    })

    expect(result.current.keys.map((k) => k.id)).toEqual([second.id, first.id])
  })

  it('동일 privateKey 중복 핀 시 무시', () => {
    const { result } = renderHook(() => usePinnedKeys())

    act(() => {
      result.current.pin(sampleKey)
    })
    act(() => {
      result.current.pin({ ...sampleKey, id: 'different-id', label: '다른 라벨' })
    })

    expect(result.current.keys).toHaveLength(1)
    expect(result.current.keys[0].id).toBe(sampleKey.id)
    expect(result.current.keys[0].label).toBe(sampleKey.label)
  })
})

describe('usePinnedKeys — updateLabel', () => {
  it('해당 id의 라벨만 업데이트', () => {
    const { result } = renderHook(() => usePinnedKeys())
    act(() => {
      result.current.pin(sampleKey)
    })

    act(() => {
      result.current.updateLabel(sampleKey.id, 'Renamed')
    })

    expect(result.current.keys[0].label).toBe('Renamed')
    // 다른 필드는 보존
    expect(result.current.keys[0].privateKey).toBe(sampleKey.privateKey)
    expect(result.current.keys[0].address).toBe(sampleKey.address)
  })

  it('알 수 없는 id면 변경 없음', () => {
    const { result } = renderHook(() => usePinnedKeys())
    act(() => {
      result.current.pin(sampleKey)
    })

    act(() => {
      result.current.updateLabel('unknown-id', 'should not apply')
    })

    expect(result.current.keys[0].label).toBe(sampleKey.label)
  })
})

describe('usePinnedKeys — unpin', () => {
  it('id로 항목 삭제', () => {
    const { result } = renderHook(() => usePinnedKeys())

    act(() => {
      result.current.pin(sampleKey)
    })
    expect(result.current.keys).toHaveLength(1)

    act(() => {
      result.current.unpin(sampleKey.id)
    })
    expect(result.current.keys).toEqual([])
  })

  it('알 수 없는 id면 변경 없음', () => {
    const { result } = renderHook(() => usePinnedKeys())

    act(() => {
      result.current.pin(sampleKey)
    })
    act(() => {
      result.current.unpin('unknown')
    })

    expect(result.current.keys).toHaveLength(1)
  })
})

describe('usePinnedKeys — isPinned', () => {
  it('저장된 privateKey면 true, 아니면 false', () => {
    const { result } = renderHook(() => usePinnedKeys())

    expect(result.current.isPinned(sampleKey.privateKey)).toBe(false)

    act(() => {
      result.current.pin(sampleKey)
    })

    expect(result.current.isPinned(sampleKey.privateKey)).toBe(true)
    expect(result.current.isPinned(`0x${'f'.repeat(64)}`)).toBe(false)
  })
})

describe('usePinnedKeys — localStorage 영속', () => {
  it('pin 호출 시 localStorage에 기록', () => {
    const { result } = renderHook(() => usePinnedKeys())
    act(() => {
      result.current.pin(sampleKey)
    })

    const stored = readStored() as PinnedKey[]
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject(sampleKey)
    expect(typeof stored[0].createdAt).toBe('number')
  })

  it('unpin 호출 시 localStorage가 빈 배열로 갱신', () => {
    const { result } = renderHook(() => usePinnedKeys())
    act(() => {
      result.current.pin(sampleKey)
    })
    act(() => {
      result.current.unpin(sampleKey.id)
    })

    expect(readStored()).toEqual([])
  })

  it('updateLabel 호출 시 localStorage 갱신', () => {
    const { result } = renderHook(() => usePinnedKeys())
    act(() => {
      result.current.pin(sampleKey)
    })
    act(() => {
      result.current.updateLabel(sampleKey.id, 'Renamed')
    })

    const stored = readStored() as PinnedKey[]
    expect(stored[0].label).toBe('Renamed')
  })

  it('다음 마운트에서 localStorage 상태를 그대로 복원', () => {
    const first = renderHook(() => usePinnedKeys())
    act(() => {
      first.result.current.pin(sampleKey)
    })
    first.unmount()

    const second = renderHook(() => usePinnedKeys())
    expect(second.result.current.keys).toHaveLength(1)
    expect(second.result.current.keys[0]).toMatchObject(sampleKey)
  })
})
