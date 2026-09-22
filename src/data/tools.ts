import {
  ArrowLeftRight,
  Binary,
  Braces,
  FileKey2,
  Hash,
  KeyRound,
  Search,
  ShieldCheck,
  SquareCheckBig,
  Type,
} from 'lucide-react'

export type ToolStatus = 'ready' | 'soon'

export type ToolCategory =
  | 'Wallet'
  | 'Address'
  | 'Amount'
  | 'Crypto'
  | 'Encoding'
  | 'Contract'
  | 'Network'

export type Tool = {
  slug: string
  name: string
  description: string
  category: ToolCategory
  icon: React.ComponentType<{ className?: string }>
  status: ToolStatus
}

export const tools: readonly Tool[] = [
  {
    slug: 'key-generator',
    name: 'Key Pair Generator',
    description: 'secp256k1 키 페어를 N개 생성하고 핀으로 저장합니다.',
    category: 'Wallet',
    icon: KeyRound,
    status: 'ready',
  },
  {
    slug: 'address-checksum',
    name: 'Address Checksum',
    description: 'EIP-55 체크섬 변환과 유효성 검사를 한 번에 처리합니다.',
    category: 'Address',
    icon: SquareCheckBig,
    status: 'soon',
  },
  {
    slug: 'unit-converter',
    name: 'Unit Converter',
    description: 'wei · gwei · ether 및 임의 decimals를 BigInt로 정밀 변환합니다.',
    category: 'Amount',
    icon: ArrowLeftRight,
    status: 'ready',
  },
  {
    slug: 'keccak-256',
    name: 'Keccak-256 Hash',
    description: 'UTF-8 / hex 입력의 keccak256 해시와 4-byte function selector를 계산합니다.',
    category: 'Crypto',
    icon: Hash,
    status: 'ready',
  },
  {
    slug: 'hex-converter',
    name: 'Hex Converter',
    description: 'Hex ↔ Decimal ↔ UTF-8 문자열을 양방향으로 변환합니다.',
    category: 'Encoding',
    icon: Binary,
    status: 'soon',
  },
  {
    slug: 'abi-codec',
    name: 'ABI Encoder / Decoder',
    description: '함수 시그니처와 args / calldata 사이를 BigInt-safe하게 변환합니다.',
    category: 'Contract',
    icon: Braces,
    status: 'ready',
  },
  {
    slug: 'mnemonic',
    name: 'Mnemonic Generator',
    description: 'BIP-39 니모닉과 시드를 생성하고 검증합니다.',
    category: 'Wallet',
    icon: KeyRound,
    status: 'soon',
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'JWT 헤더·페이로드·서명을 분리해 사람이 읽기 쉽게 보여줍니다.',
    category: 'Encoding',
    icon: FileKey2,
    status: 'soon',
  },
  {
    slug: 'base-encoding',
    name: 'Base58 / Base64',
    description: '체인별로 자주 쓰는 Base58, Base64 인코딩을 지원합니다.',
    category: 'Encoding',
    icon: Type,
    status: 'soon',
  },
  {
    slug: 'signature-verifier',
    name: 'Signature Verifier',
    description: 'EIP-712 / personal_sign / raw digest 서명을 만들고 검증합니다. 핀 키 연동.',
    category: 'Crypto',
    icon: ShieldCheck,
    status: 'ready',
  },
  {
    slug: 'explorer-search',
    name: 'Block Explorer Search',
    description: '주소·트랜잭션을 여러 익스플로러에서 한 번에 조회합니다.',
    category: 'Network',
    icon: Search,
    status: 'soon',
  },
] as const

export function toolHref(slug: string): string {
  return `/tools/${slug}`
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug)
}
