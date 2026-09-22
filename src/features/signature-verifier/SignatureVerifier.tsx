import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePinnedKeys } from '@/features/key-generator/storage'
import {
  recoverDigest,
  recoverEip712,
  recoverPersonal,
  signDigest,
  signEip712,
  signPersonal,
} from './crypto'
import type { RecoverSuccess, SignMode, SignSuccess } from './crypto'

type Operation = 'sign' | 'verify'
type ResultState =
  | { kind: 'idle' }
  | { kind: 'sign'; value: SignSuccess }
  | {
      kind: 'verify'
      value: RecoverSuccess
      expectedSigner: string | null
    }
  | { kind: 'error'; error: string }

const MODE_LABEL: Record<SignMode, string> = {
  eip712: 'EIP-712',
  personalSign: 'personal_sign',
  digest: 'raw digest',
}

const MODE_DESCRIPTION: Record<SignMode, string> = {
  eip712: 'Structured typed data (EIP-712) — MetaMask `eth_signTypedData_v4`',
  personalSign: 'UTF-8 message에 EIP-191 prefix를 붙여 해싱한 후 서명',
  digest: '32-byte hash를 secp256k1로 직접 서명 (저수준)',
}

const EIP712_PLACEHOLDER = `{
  "domain": { "name": "Ether Mail", "version": "1", "chainId": 1, "verifyingContract": "0x..." },
  "types": { ... },
  "primaryType": "Mail",
  "message": { ... }
}`

export function SignatureVerifier() {
  const [operation, setOperation] = useState<Operation>('sign')
  const [mode, setMode] = useState<SignMode>('eip712')
  const [privateKey, setPrivateKey] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [signature, setSignature] = useState('')
  const [expectedSigner, setExpectedSigner] = useState('')
  const [typedDataJson, setTypedDataJson] = useState('')
  const [message, setMessage] = useState('')
  const [digest, setDigest] = useState('')
  const [result, setResult] = useState<ResultState>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)

  const pinned = usePinnedKeys()

  async function handleSubmit() {
    setBusy(true)
    setResult({ kind: 'idle' })

    if (operation === 'sign') {
      const r =
        mode === 'eip712'
          ? await signEip712(privateKey, typedDataJson)
          : mode === 'personalSign'
            ? await signPersonal(privateKey, message)
            : await signDigest(privateKey, digest)
      setResult(
        r.ok ? { kind: 'sign', value: r.value } : { kind: 'error', error: r.error },
      )
    } else {
      const r =
        mode === 'eip712'
          ? await recoverEip712(typedDataJson, signature)
          : mode === 'personalSign'
            ? await recoverPersonal(message, signature)
            : await recoverDigest(digest, signature)
      setResult(
        r.ok
          ? {
              kind: 'verify',
              value: r.value,
              expectedSigner: expectedSigner.trim() === '' ? null : expectedSigner.trim(),
            }
          : { kind: 'error', error: r.error },
      )
    }

    setBusy(false)
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-foreground" />
          <h2 className="text-xl font-semibold">Signature Verifier</h2>
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
            secp256k1
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          EIP-712, EIP-191 personal_sign, 또는 raw digest 모드로 서명을 만들고
          검증합니다. 핀으로 저장된 키가 있으면 picker에서 바로 불러올 수
          있어요.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">테스트/개발 전용.</span>{' '}
          이 도구는 입력한 개인키를 메모리에서만 사용하지만, Key Generator로
          저장한 핀 키는 localStorage에 평문으로 있습니다. 실제 자산이 있는
          지갑의 개인키는 입력하지 마세요.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SegmentedToggle
          value={operation}
          options={[
            { value: 'sign', label: 'Sign' },
            { value: 'verify', label: 'Verify' },
          ]}
          onChange={setOperation}
        />
        <SegmentedToggle
          value={mode}
          options={[
            { value: 'eip712', label: 'EIP-712' },
            { value: 'personalSign', label: 'personal_sign' },
            { value: 'digest', label: 'raw digest' },
          ]}
          onChange={setMode}
        />
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">
            {operation === 'sign' ? 'Sign' : 'Verify'} — {MODE_LABEL[mode]}
          </CardTitle>
          <CardDescription>{MODE_DESCRIPTION[mode]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {operation === 'sign' && (
            <PrivateKeyField
              value={privateKey}
              onChange={setPrivateKey}
              show={showPrivateKey}
              onToggleShow={() => setShowPrivateKey((v) => !v)}
              pinned={pinned}
            />
          )}

          {mode === 'eip712' && (
            <div className="space-y-1.5">
              <Label
                htmlFor="sv-typed"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                typed data (JSON)
              </Label>
              <Textarea
                id="sv-typed"
                value={typedDataJson}
                onChange={(e) => setTypedDataJson(e.target.value)}
                placeholder={EIP712_PLACEHOLDER}
                rows={10}
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
          )}

          {mode === 'personalSign' && (
            <div className="space-y-1.5">
              <Label
                htmlFor="sv-message"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                message (UTF-8)
              </Label>
              <Textarea
                id="sv-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="hello"
                rows={4}
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
          )}

          {mode === 'digest' && (
            <div className="space-y-1.5">
              <Label
                htmlFor="sv-digest"
                className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                digest (0x + 64 hex)
              </Label>
              <Input
                id="sv-digest"
                value={digest}
                onChange={(e) => setDigest(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
          )}

          {operation === 'verify' && (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="sv-signature"
                  className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  signature (0x + 130 hex)
                </Label>
                <Textarea
                  id="sv-signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="0x..."
                  rows={2}
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="sv-expected"
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  expected signer
                  <span className="text-muted-foreground/70">(선택)</span>
                </Label>
                <Input
                  id="sv-expected"
                  value={expectedSigner}
                  onChange={(e) => setExpectedSigner(e.target.value)}
                  placeholder="0xCD2a..."
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={busy}>
            {operation === 'sign' ? 'Sign' : 'Verify'}
          </Button>
        </CardContent>
      </Card>

      <ResultCard state={result} />
    </section>
  )
}

type SegmentedToggleProps<T extends string> = {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: SegmentedToggleProps<T>) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            'rounded-sm px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

type PrivateKeyFieldProps = {
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  pinned: ReturnType<typeof usePinnedKeys>
}

function PrivateKeyField({
  value,
  onChange,
  show,
  onToggleShow,
  pinned,
}: PrivateKeyFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="sv-pk"
        className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        private key
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="sv-pk"
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            autoComplete="off"
            className="pr-9 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleShow}
            aria-label={show ? '개인키 숨기기' : '개인키 보기'}
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          >
            {show ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={pinned.keys.length === 0}
              className="font-mono text-xs"
            >
              <KeyRound className="size-3.5" />
              핀 키 {pinned.keys.length > 0 && `(${pinned.keys.length})`}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-w-sm">
            {pinned.keys.length === 0 ? (
              <DropdownMenuItem disabled>
                저장된 핀 키가 없습니다
              </DropdownMenuItem>
            ) : (
              pinned.keys.map((entry) => (
                <DropdownMenuItem
                  key={entry.id}
                  onClick={() => onChange(entry.privateKey)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {entry.address.slice(0, 10)}…{entry.address.slice(-6)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function ResultCard({ state }: { state: ResultState }) {
  if (state.kind === 'idle') {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="px-6 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          입력 후 sign 또는 verify 버튼을 누르면 결과가 표시됩니다.
        </CardContent>
      </Card>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-start gap-2 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-foreground/90">{state.error}</span>
        </CardContent>
      </Card>
    )
  }

  if (state.kind === 'sign') {
    const { signature, signer, digest, r, s, v } = state.value
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Signature</CardTitle>
          <CardDescription>
            {signer} 로부터 만들어진 서명입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResultField label="signature" value={signature} emphasis />
          <ResultField label="signer" value={signer} mono />
          <ResultField label="digest" value={digest} mono />
          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultField label="r" value={r} mono />
            <ResultField label="s" value={s} mono />
          </div>
          <ResultField label="v" value={String(v)} mono />
        </CardContent>
      </Card>
    )
  }

  // verify
  const { value, expectedSigner } = state
  const match =
    expectedSigner !== null
      ? value.signer.toLowerCase() === expectedSigner.toLowerCase()
      : null

  return (
    <Card
      className={cn(
        match === true && 'border-foreground/30',
        match === false && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Recovered</CardTitle>
          {match !== null && (
            <Badge
              variant={match ? 'default' : 'destructive'}
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              {match ? (
                <>
                  <ShieldCheck className="size-3" /> match
                </>
              ) : (
                <>
                  <ShieldX className="size-3" /> mismatch
                </>
              )}
            </Badge>
          )}
        </div>
        <CardDescription>
          {match === true && '서명이 기대 주소와 일치합니다.'}
          {match === false && `기대 주소(${expectedSigner})와 다릅니다.`}
          {match === null &&
            '복구된 주소입니다. expected signer를 입력하면 자동으로 비교합니다.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResultField label="recovered signer" value={value.signer} mono emphasis />
        <ResultField label="digest" value={value.digest} mono />
        <Separator />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ResultField label="r" value={value.r} mono />
          <ResultField label="s" value={value.s} mono />
        </div>
        <ResultField label="v" value={String(value.v)} mono />
      </CardContent>
    </Card>
  )
}

function ResultField({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string
  value: string
  mono?: boolean
  emphasis?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-6 px-2"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {copied ? 'copied' : 'copy'}
          </span>
        </Button>
      </div>
      <code
        className={cn(
          'block break-all rounded-md border bg-muted/30 px-3 py-2',
          mono !== false && 'font-mono',
          emphasis ? 'text-sm font-medium' : 'text-xs',
        )}
      >
        {value}
      </code>
    </div>
  )
}
