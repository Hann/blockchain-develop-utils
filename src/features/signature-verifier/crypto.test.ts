import { describe, expect, it } from 'vitest'
import {
  isHash32,
  isPrivateKey,
  isSignatureHex,
  recoverDigest,
  recoverEip712,
  recoverPersonal,
  signDigest,
  signEip712,
  signPersonal,
} from './crypto'

// EIP-712 공식 spec test vector
// 출처: https://eips.ethereum.org/EIPS/eip-712 (Mail 예제)
const SPEC_PRIVATE_KEY =
  '0xc85ef7d79691fe79573b1a7064c19c1a9819ebdbd1faaab1a8ec92344438aaf4'
const SPEC_SIGNER = '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
const SPEC_TYPED_DATA = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  message: {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    },
    to: {
      name: 'Bob',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    },
    contents: 'Hello, Bob!',
  },
}
const SPEC_TYPED_DATA_JSON = JSON.stringify(SPEC_TYPED_DATA)
const SPEC_DIGEST =
  '0xbe609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2'
const SPEC_SIGNATURE =
  '0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c'

describe('input validators', () => {
  it('isPrivateKey: 0x + 64 hex만 허용', () => {
    expect(isPrivateKey(SPEC_PRIVATE_KEY)).toBe(true)
    expect(isPrivateKey('0x' + 'a'.repeat(64))).toBe(true)
    expect(isPrivateKey('0x' + 'a'.repeat(63))).toBe(false)
    expect(isPrivateKey('0xZZ' + 'a'.repeat(62))).toBe(false)
    expect(isPrivateKey('a'.repeat(64))).toBe(false)
    expect(isPrivateKey('')).toBe(false)
  })

  it('isSignatureHex: 0x + 130 hex만 허용', () => {
    expect(isSignatureHex(SPEC_SIGNATURE)).toBe(true)
    expect(isSignatureHex('0x' + 'a'.repeat(130))).toBe(true)
    expect(isSignatureHex('0x' + 'a'.repeat(128))).toBe(false)
    expect(isSignatureHex('')).toBe(false)
  })

  it('isHash32: 0x + 64 hex만 허용', () => {
    expect(isHash32(SPEC_DIGEST)).toBe(true)
    expect(isHash32('0x' + '0'.repeat(64))).toBe(true)
    expect(isHash32('0x' + '0'.repeat(63))).toBe(false)
  })
})

describe('signEip712 — EIP-712 spec test vector', () => {
  it('Mail 예제 서명이 spec과 정확히 일치', async () => {
    const result = await signEip712(SPEC_PRIVATE_KEY, SPEC_TYPED_DATA_JSON)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.signature).toBe(SPEC_SIGNATURE)
      expect(result.value.signer).toBe(SPEC_SIGNER)
      expect(result.value.digest).toBe(SPEC_DIGEST)
    }
  })

  it('r/s/v 분해 — v는 27 또는 28', async () => {
    const result = await signEip712(SPEC_PRIVATE_KEY, SPEC_TYPED_DATA_JSON)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect([27, 28]).toContain(result.value.v)
      expect(result.value.r).toMatch(/^0x[0-9a-fA-F]{64}$/)
      expect(result.value.s).toMatch(/^0x[0-9a-fA-F]{64}$/)
    }
  })

  it('잘못된 개인키는 거절', async () => {
    const result = await signEip712('not-a-key', SPEC_TYPED_DATA_JSON)
    expect(result.ok).toBe(false)
  })

  it('잘못된 typed data JSON은 거절', async () => {
    const result = await signEip712(SPEC_PRIVATE_KEY, '{not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/JSON/)
  })

  it('필수 필드 없으면 거절', async () => {
    const result = await signEip712(
      SPEC_PRIVATE_KEY,
      JSON.stringify({ domain: {} }),
    )
    expect(result.ok).toBe(false)
  })
})

describe('recoverEip712 — spec test vector', () => {
  it('spec 서명에서 signer 복구', async () => {
    const result = await recoverEip712(SPEC_TYPED_DATA_JSON, SPEC_SIGNATURE)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.signer).toBe(SPEC_SIGNER)
      expect(result.value.digest).toBe(SPEC_DIGEST)
    }
  })

  it('잘못된 서명 형식은 거절', async () => {
    const result = await recoverEip712(SPEC_TYPED_DATA_JSON, '0xabc')
    expect(result.ok).toBe(false)
  })
})

describe('signPersonal / recoverPersonal — EIP-191 라운드 트립', () => {
  it('서명 후 복구하면 동일한 signer', async () => {
    const message = 'hello'
    const signed = await signPersonal(SPEC_PRIVATE_KEY, message)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return

    expect(signed.value.signer).toBe(SPEC_SIGNER)
    expect(signed.value.signature).toMatch(/^0x[0-9a-fA-F]{130}$/)

    const recovered = await recoverPersonal(message, signed.value.signature)
    expect(recovered.ok).toBe(true)
    if (recovered.ok) expect(recovered.value.signer).toBe(SPEC_SIGNER)
  })

  it('UTF-8 멀티바이트 메시지도 처리', async () => {
    const message = '안녕 🚀 hello'
    const signed = await signPersonal(SPEC_PRIVATE_KEY, message)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return

    const recovered = await recoverPersonal(message, signed.value.signature)
    expect(recovered.ok).toBe(true)
    if (recovered.ok) expect(recovered.value.signer).toBe(signed.value.signer)
  })

  it('서명 결정성 (RFC 6979) — 같은 입력은 같은 서명', async () => {
    const a = await signPersonal(SPEC_PRIVATE_KEY, 'hello')
    const b = await signPersonal(SPEC_PRIVATE_KEY, 'hello')
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.value.signature).toBe(b.value.signature)
  })

  it('메시지가 다르면 서명도 다름', async () => {
    const a = await signPersonal(SPEC_PRIVATE_KEY, 'hello')
    const b = await signPersonal(SPEC_PRIVATE_KEY, 'world')
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.value.signature).not.toBe(b.value.signature)
  })
})

describe('signDigest / recoverDigest — 저수준 hash 서명', () => {
  it('digest 서명 후 복구하면 동일한 signer', async () => {
    const digest = '0x' + 'a'.repeat(64)
    const signed = await signDigest(SPEC_PRIVATE_KEY, digest)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return

    expect(signed.value.signer).toBe(SPEC_SIGNER)
    expect(signed.value.digest).toBe(digest)

    const recovered = await recoverDigest(digest, signed.value.signature)
    expect(recovered.ok).toBe(true)
    if (recovered.ok) expect(recovered.value.signer).toBe(SPEC_SIGNER)
  })

  it('잘못된 digest 길이는 거절', async () => {
    const result = await signDigest(SPEC_PRIVATE_KEY, '0xabc')
    expect(result.ok).toBe(false)
  })
})

describe('mode 교차 일관성', () => {
  it('personal_sign 서명을 raw digest 모드로 복구하면 같은 signer', async () => {
    // personal_sign은 내부적으로 hashMessage(msg)를 digest로 사용
    const message = 'hello'
    const signed = await signPersonal(SPEC_PRIVATE_KEY, message)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return

    const recoveredViaDigest = await recoverDigest(
      signed.value.digest,
      signed.value.signature,
    )
    expect(recoveredViaDigest.ok).toBe(true)
    if (recoveredViaDigest.ok) {
      expect(recoveredViaDigest.value.signer).toBe(signed.value.signer)
    }
  })

  it('EIP-712 서명을 raw digest 모드로 복구하면 같은 signer', async () => {
    const signed = await signEip712(SPEC_PRIVATE_KEY, SPEC_TYPED_DATA_JSON)
    expect(signed.ok).toBe(true)
    if (!signed.ok) return

    const recoveredViaDigest = await recoverDigest(
      signed.value.digest,
      signed.value.signature,
    )
    expect(recoveredViaDigest.ok).toBe(true)
    if (recoveredViaDigest.ok) {
      expect(recoveredViaDigest.value.signer).toBe(SPEC_SIGNER)
    }
  })
})
