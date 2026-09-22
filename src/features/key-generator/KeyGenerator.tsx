import { useCallback, useRef, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateKeyPairs, maskMnemonic, maskPrivateKey } from './crypto'
import { downloadKeyPairs } from './export'
import { usePinnedKeys } from './storage'
import { PinDialog } from './PinDialog'
import type { Hex, KeyPair, PinnedKey } from './types'

const MIN_COUNT = 1
const MAX_COUNT = 50

type CopyKind = 'address' | 'privateKey' | 'mnemonic'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create'; keyPair: KeyPair }
  | { mode: 'edit'; pinned: PinnedKey }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function KeyGenerator() {
  const [countInput, setCountInput] = useState('5')
  const [generated, setGenerated] = useState<KeyPair[]>([])
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [copyTokens, setCopyTokens] = useState<Set<string>>(() => new Set())
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' })

  const copyTimers = useRef<Map<string, number>>(new Map())
  const pinned = usePinnedKeys()

  const handleGenerate = useCallback(() => {
    const parsed = Number.parseInt(countInput, 10)
    const count = clamp(
      Number.isFinite(parsed) ? parsed : MIN_COUNT,
      MIN_COUNT,
      MAX_COUNT,
    )
    setCountInput(String(count))
    setGenerated(generateKeyPairs(count))
    setRevealed(new Set())
  }, [countInput])

  const toggleReveal = useCallback((id: string) => {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCopy = useCallback((id: string, kind: CopyKind, value: string) => {
    const token = `${id}:${kind}`
    void navigator.clipboard.writeText(value).then(() => {
      setCopyTokens((current) => {
        const next = new Set(current)
        next.add(token)
        return next
      })

      const existing = copyTimers.current.get(token)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setCopyTokens((current) => {
          const next = new Set(current)
          next.delete(token)
          return next
        })
        copyTimers.current.delete(token)
      }, 1500)
      copyTimers.current.set(token, timer)
    })
  }, [])

  return (
    <section id="key-generator" className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-foreground" />
          <h2 className="text-xl font-semibold">Key Pair Generator</h2>
          <Badge variant="secondary">secp256k1</Badge>
          <Badge variant="secondary">BIP39</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          행마다 니모닉(BIP39)을 만들고, 표준 EVM 경로{' '}
          <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs">
            m/44&apos;/60&apos;/0&apos;/0/0
          </code>{' '}
          의 개인키와 주소를 함께 생성합니다. 자주 쓰는 키는 핀으로 라벨과 함께
          저장해두면 다음에도 그대로 사용할 수 있어요.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">테스트/개발 전용.</span>{' '}
          이곳에서 생성된 개인키와 핀으로 저장한 데이터는 브라우저
          localStorage에 평문으로 저장됩니다. 실제 자산이 있는 지갑의 개인키는{' '}
          <span className="font-medium text-foreground">절대</span> 저장하지
          마세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">새로 생성</CardTitle>
          <CardDescription>
            한 번에 {MIN_COUNT}–{MAX_COUNT}개의 키 페어를 만들 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              handleGenerate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="key-count">개수</Label>
              <Input
                id="key-count"
                type="number"
                inputMode="numeric"
                min={MIN_COUNT}
                max={MAX_COUNT}
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
                className="w-32"
              />
            </div>
            <Button type="submit" className="sm:ml-2">
              <Sparkles className="size-4" />
              {generated.length > 0 ? '다시 생성' : '생성'}
            </Button>
            {generated.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setGenerated([])
                  setRevealed(new Set())
                }}
              >
                <RefreshCw className="size-4" />
                결과 비우기
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">
              생성 결과 ({generated.length})
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="size-3.5" />
                  전체 다운로드
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => downloadKeyPairs(generated, 'json')}
                >
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => downloadKeyPairs(generated, 'csv')}
                >
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ul className="space-y-3">
            {generated.map((keyPair, index) => (
              <li key={keyPair.id}>
                <KeyRow
                  index={index + 1}
                  address={keyPair.address}
                  privateKey={keyPair.privateKey}
                  mnemonic={keyPair.mnemonic}
                  revealed={revealed.has(keyPair.id)}
                  copyTokens={copyTokens}
                  rowId={keyPair.id}
                  onToggleReveal={() => toggleReveal(keyPair.id)}
                  onCopy={(kind, value) => handleCopy(keyPair.id, kind, value)}
                  trailing={
                    <Button
                      size="sm"
                      variant={pinned.isPinned(keyPair.privateKey) ? 'secondary' : 'outline'}
                      disabled={pinned.isPinned(keyPair.privateKey)}
                      onClick={() =>
                        setDialog({ mode: 'create', keyPair })
                      }
                    >
                      <Pin className="size-3.5" />
                      {pinned.isPinned(keyPair.privateKey) ? '저장됨' : '핀'}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-foreground">
            <Pin className="mr-1 inline size-4 align-[-2px]" />
            핀 저장된 키 ({pinned.keys.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            localStorage에 저장됨
          </span>
        </div>

        {pinned.keys.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            아직 저장된 키가 없습니다. 위에서 생성한 키 옆 핀 버튼을 눌러
            라벨과 함께 저장해보세요.
          </p>
        ) : (
          <ul className="space-y-3">
            {pinned.keys.map((entry) => (
              <li key={entry.id}>
                <KeyRow
                  label={entry.label}
                  address={entry.address}
                  privateKey={entry.privateKey}
                  mnemonic={entry.mnemonic}
                  revealed={revealed.has(entry.id)}
                  copyTokens={copyTokens}
                  rowId={entry.id}
                  onToggleReveal={() => toggleReveal(entry.id)}
                  onCopy={(kind, value) => handleCopy(entry.id, kind, value)}
                  trailing={
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDialog({ mode: 'edit', pinned: entry })
                        }
                      >
                        <Pencil className="size-3.5" />
                        라벨
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => pinned.unpin(entry.id)}
                      >
                        <PinOff className="size-3.5" />
                        해제
                      </Button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PinDialog
        key={
          dialog.mode === 'create'
            ? `create:${dialog.keyPair.id}`
            : dialog.mode === 'edit'
              ? `edit:${dialog.pinned.id}:${dialog.pinned.label}`
              : 'closed'
        }
        open={dialog.mode !== 'closed'}
        onOpenChange={(open) => {
          if (!open) setDialog({ mode: 'closed' })
        }}
        mode={dialog.mode === 'edit' ? 'edit' : 'create'}
        address={
          dialog.mode === 'create'
            ? dialog.keyPair.address
            : dialog.mode === 'edit'
              ? dialog.pinned.address
              : undefined
        }
        initialLabel={dialog.mode === 'edit' ? dialog.pinned.label : ''}
        onSubmit={(label) => {
          if (dialog.mode === 'create') {
            pinned.pin({
              id: dialog.keyPair.id,
              label,
              mnemonic: dialog.keyPair.mnemonic,
              privateKey: dialog.keyPair.privateKey,
              address: dialog.keyPair.address,
            })
          } else if (dialog.mode === 'edit') {
            pinned.updateLabel(dialog.pinned.id, label)
          }
        }}
      />
    </section>
  )
}

type KeyRowProps = {
  rowId: string
  address: Hex
  privateKey: Hex
  mnemonic?: string
  revealed: boolean
  copyTokens: Set<string>
  onToggleReveal: () => void
  onCopy: (kind: CopyKind, value: string) => void
  trailing: React.ReactNode
  index?: number
  label?: string
}

function KeyRow({
  rowId,
  address,
  privateKey,
  mnemonic,
  revealed,
  copyTokens,
  onToggleReveal,
  onCopy,
  trailing,
  index,
  label,
}: KeyRowProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {index !== undefined && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              #{index}
            </span>
          )}
          {label && (
            <span className="truncate text-sm font-medium text-foreground">
              {label}
            </span>
          )}
        </div>
        {trailing}
      </div>

      <div className="space-y-2">
        <DataField
          label="Address"
          value={address}
          display={address}
          copied={copyTokens.has(`${rowId}:address`)}
          onCopy={() => onCopy('address', address)}
        />
        <DataField
          label="Private"
          value={privateKey}
          display={revealed ? privateKey : maskPrivateKey(privateKey)}
          copied={copyTokens.has(`${rowId}:privateKey`)}
          onCopy={() => onCopy('privateKey', privateKey)}
          onToggleReveal={onToggleReveal}
          revealed={revealed}
        />
        {mnemonic && (
          <DataField
            label="Mnemonic"
            value={mnemonic}
            display={revealed ? mnemonic : maskMnemonic(mnemonic)}
            copied={copyTokens.has(`${rowId}:mnemonic`)}
            onCopy={() => onCopy('mnemonic', mnemonic)}
            onToggleReveal={onToggleReveal}
            revealed={revealed}
            wrap
          />
        )}
      </div>
    </div>
  )
}

type DataFieldProps = {
  label: string
  value: string
  display: string
  copied: boolean
  onCopy: () => void
  onToggleReveal?: () => void
  revealed?: boolean
  wrap?: boolean
}

function DataField({
  label,
  display,
  copied,
  onCopy,
  onToggleReveal,
  revealed,
  wrap,
}: DataFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <code
        className={`flex-1 rounded bg-muted/50 px-2 py-1.5 font-mono text-xs ${
          wrap ? 'break-words' : 'truncate'
        }`}
      >
        {display}
      </code>
      {onToggleReveal && (
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={onToggleReveal}
          aria-label={revealed ? '개인키 숨기기' : '개인키 보기'}
        >
          {revealed ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        onClick={onCopy}
        aria-label={`${label} 복사`}
      >
        {copied ? (
          <Check className="size-4 text-foreground" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  )
}
