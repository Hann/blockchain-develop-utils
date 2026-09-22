export type Hex = `0x${string}`

export type KeyPair = {
  id: string
  mnemonic: string
  privateKey: Hex
  address: Hex
}

// mnemonic은 구버전(키만 저장하던 시절) 데이터와의 호환을 위해 optional.
export type PinnedKey = Omit<KeyPair, 'mnemonic'> & {
  mnemonic?: string
  label: string
  createdAt: number
}
