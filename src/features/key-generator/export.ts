import type { KeyPair } from './types'

// generateKeyPair가 사용하는 파생 경로와 동일 (m/44'/60'/0'/0/0).
export const DERIVATION_PATH = "m/44'/60'/0'/0/0"

export type ExportFormat = 'json' | 'csv'

const CSV_COLUMNS = [
  'index',
  'address',
  'privateKey',
  'mnemonic',
  'derivationPath',
] as const

// RFC 4180: 쉼표·따옴표·개행이 있으면 따옴표로 감싸고 내부 따옴표는 이중화.
function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function keyPairsToJson(keyPairs: KeyPair[]): string {
  const rows = keyPairs.map((kp) => ({
    address: kp.address,
    privateKey: kp.privateKey,
    mnemonic: kp.mnemonic,
    derivationPath: DERIVATION_PATH,
  }))
  return JSON.stringify(rows, null, 2)
}

export function keyPairsToCsv(keyPairs: KeyPair[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows = keyPairs.map((kp, index) =>
    [
      String(index + 1),
      kp.address,
      kp.privateKey,
      kp.mnemonic,
      DERIVATION_PATH,
    ]
      .map(escapeCsvCell)
      .join(','),
  )
  return [header, ...rows].join('\r\n')
}

export function serializeKeyPairs(
  keyPairs: KeyPair[],
  format: ExportFormat,
): string {
  return format === 'json'
    ? keyPairsToJson(keyPairs)
    : keyPairsToCsv(keyPairs)
}

const MIME_TYPES: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
}

// 직렬화된 내용을 파일로 내려받는다 (브라우저 전용 부수효과).
export function downloadKeyPairs(
  keyPairs: KeyPair[],
  format: ExportFormat,
): void {
  const content = serializeKeyPairs(keyPairs, format)
  const blob = new Blob([content], { type: `${MIME_TYPES[format]};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `keypairs-${keyPairs.length}.${format}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
