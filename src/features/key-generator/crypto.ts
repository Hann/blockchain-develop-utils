import { toHex } from 'viem'
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts'
import type { KeyPair } from './types'

// 행마다 독립 mnemonic을 만들고, 표준 EVM 경로(m/44'/60'/0'/0/0)의
// 첫 계정에서 개인키·주소를 파생한다.
export function generateKeyPair(): KeyPair {
  const mnemonic = generateMnemonic(english)
  const account = mnemonicToAccount(mnemonic)
  const hdPrivateKey = account.getHdKey().privateKey
  if (!hdPrivateKey) {
    throw new Error('파생된 HD 키에 개인키가 없습니다.')
  }
  return {
    id: crypto.randomUUID(),
    mnemonic,
    privateKey: toHex(hdPrivateKey),
    address: account.address,
  }
}

export function generateKeyPairs(count: number): KeyPair[] {
  return Array.from({ length: count }, generateKeyPair)
}

export function maskPrivateKey(privateKey: string): string {
  if (privateKey.length <= 12) return privateKey
  return `${privateKey.slice(0, 6)}…${privateKey.slice(-4)}`
}

// 단어 개수만큼 점 그룹으로 가린다 (단어 내용·길이는 노출하지 않음).
export function maskMnemonic(mnemonic: string): string {
  const words = mnemonic.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  return words.map(() => '••••').join(' ')
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
