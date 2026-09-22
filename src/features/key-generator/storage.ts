import { useCallback, useEffect, useState } from 'react'
import type { PinnedKey } from './types'

const STORAGE_KEY = 'blockchain-dev-utils:pinned-keys:v1'

function isHex(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)
}

function isPinnedKey(value: unknown): value is PinnedKey {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.createdAt === 'number' &&
    // mnemonic은 optional (구버전 데이터엔 없음), 있으면 문자열이어야 함
    (v.mnemonic === undefined || typeof v.mnemonic === 'string') &&
    isHex(v.privateKey) &&
    isHex(v.address)
  )
}

function readPinnedKeys(): PinnedKey[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPinnedKey)
  } catch {
    return []
  }
}

function writePinnedKeys(keys: PinnedKey[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function usePinnedKeys() {
  const [keys, setKeys] = useState<PinnedKey[]>(() => readPinnedKeys())

  useEffect(() => {
    writePinnedKeys(keys)
  }, [keys])

  const pin = useCallback(
    (entry: Omit<PinnedKey, 'createdAt'>) => {
      setKeys((current) => {
        if (current.some((k) => k.privateKey === entry.privateKey)) {
          return current
        }
        return [{ ...entry, createdAt: Date.now() }, ...current]
      })
    },
    [],
  )

  const updateLabel = useCallback((id: string, label: string) => {
    setKeys((current) =>
      current.map((k) => (k.id === id ? { ...k, label } : k)),
    )
  }, [])

  const unpin = useCallback((id: string) => {
    setKeys((current) => current.filter((k) => k.id !== id))
  }, [])

  const isPinned = useCallback(
    (privateKey: string) => keys.some((k) => k.privateKey === privateKey),
    [keys],
  )

  return { keys, pin, updateLabel, unpin, isPinned }
}
