import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Hash, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { computeKeccak } from './hash'
import type { InputMode } from './hash'

type CopyKind = 'hash' | 'selector'

const MODE_HINTS: Record<InputMode, string> = {
  text: '예: transfer(address,uint256) 처럼 임의의 UTF-8 문자열',
  hex: '예: 0xdeadbeef — 0x 접두 + 짝수 hex character',
}

export function KeccakHash() {
  const [mode, setMode] = useState<InputMode>('text')
  const [textInput, setTextInput] = useState('')
  const [hexInput, setHexInput] = useState('0x')
  const [copyTokens, setCopyTokens] = useState<Set<CopyKind>>(() => new Set())
  const copyTimers = useRef<Map<CopyKind, number>>(new Map())

  const input = mode === 'text' ? textInput : hexInput
  const setInput = mode === 'text' ? setTextInput : setHexInput

  const result = useMemo(() => computeKeccak(input, mode), [input, mode])

  function handleCopy(kind: CopyKind, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopyTokens((prev) => {
        const next = new Set(prev)
        next.add(kind)
        return next
      })
      const existing = copyTimers.current.get(kind)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setCopyTokens((prev) => {
          const next = new Set(prev)
          next.delete(kind)
          return next
        })
        copyTimers.current.delete(kind)
      }, 1500)
      copyTimers.current.set(kind, timer)
    })
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="size-5 text-foreground" />
          <h2 className="text-xl font-semibold">Keccak-256 Hash</h2>
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
            32 bytes
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          UTF-8 문자열이나 hex 바이트의 keccak256 해시를 계산하고, Solidity
          function selector(첫 4바이트)를 함께 보여줍니다.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">입력</CardTitle>
            <CardDescription className="mt-1">
              {MODE_HINTS[mode]}
            </CardDescription>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'text'
                ? 'transfer(address,uint256)'
                : '0xdeadbeef'
            }
            rows={mode === 'text' ? 4 : 3}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!result.ok}
            className={cn(
              'font-mono text-sm',
              !result.ok && 'border-destructive focus-visible:ring-destructive/30',
            )}
          />
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>
              {result.ok ? `${result.byteLength} bytes` : 'invalid input'}
            </span>
            {!result.ok && (
              <span className="flex items-center gap-1 text-destructive">
                <TriangleAlert className="size-3" />
                0x 접두 + 짝수 hex character 필요
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">출력</CardTitle>
          <CardDescription>
            동일한 입력은 항상 같은 해시를 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OutputField
            label="function selector"
            description="첫 4바이트 — Solidity 함수 식별자"
            value={result.ok ? result.selector : ''}
            disabled={!result.ok}
            copied={copyTokens.has('selector')}
            onCopy={() =>
              result.ok && handleCopy('selector', result.selector)
            }
            emphasis
          />
          <Separator />
          <OutputField
            label="full hash"
            description="32 bytes (256 bits)"
            value={result.ok ? result.hash : ''}
            disabled={!result.ok}
            copied={copyTokens.has('hash')}
            onCopy={() => result.ok && handleCopy('hash', result.hash)}
          />
        </CardContent>
      </Card>
    </section>
  )
}

type ModeToggleProps = {
  mode: InputMode
  onChange: (mode: InputMode) => void
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
      <ModeButton active={mode === 'text'} onClick={() => onChange('text')}>
        UTF-8 text
      </ModeButton>
      <ModeButton active={mode === 'hex'} onClick={() => onChange('hex')}>
        Hex bytes
      </ModeButton>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-sm px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

type OutputFieldProps = {
  label: string
  description: string
  value: string
  disabled: boolean
  copied: boolean
  onCopy: () => void
  emphasis?: boolean
}

function OutputField({
  label,
  description,
  value,
  disabled,
  copied,
  onCopy,
  emphasis,
}: OutputFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCopy}
          disabled={disabled}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {copied ? 'copied' : 'copy'}
          </span>
        </Button>
      </div>
      <code
        className={cn(
          'block break-all rounded-md border bg-muted/30 px-3 py-2.5 font-mono',
          emphasis ? 'text-base font-medium' : 'text-xs',
          disabled && 'text-muted-foreground',
        )}
      >
        {value || (disabled ? '—' : value)}
      </code>
    </div>
  )
}
