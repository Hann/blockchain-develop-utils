import { useMemo, useRef, useState } from 'react'
import { Braces, Check, Copy, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  decodeCall,
  encodeCall,
  parseSignature,
} from './codec'
import type { ParseResult, ParsedSignature } from './codec'

type Mode = 'encode' | 'decode'
type CopyKind = 'calldata' | 'selector' | 'decoded'

const SIGNATURE_PLACEHOLDER = 'transfer(address,uint256)'
const ARGS_PLACEHOLDER = '["0x0000…0001", "1000000000000000000"]'
const CALLDATA_PLACEHOLDER = '0xa9059cbb…'

export function AbiCodec() {
  const [mode, setMode] = useState<Mode>('encode')
  const [signature, setSignature] = useState('')
  const [argsJson, setArgsJson] = useState('')
  const [calldata, setCalldata] = useState('')
  const [copyTokens, setCopyTokens] = useState<Set<CopyKind>>(() => new Set())
  const copyTimers = useRef<Map<CopyKind, number>>(new Map())

  const parsed: ParseResult = useMemo(
    () => parseSignature(signature),
    [signature],
  )

  const encodeResult = useMemo(
    () =>
      mode === 'encode' && signature.trim() !== ''
        ? encodeCall(signature, argsJson)
        : null,
    [mode, signature, argsJson],
  )

  const decodeResult = useMemo(
    () =>
      mode === 'decode' && signature.trim() !== ''
        ? decodeCall(signature, calldata)
        : null,
    [mode, signature, calldata],
  )

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
          <Braces className="size-5 text-foreground" />
          <h2 className="text-xl font-semibold">ABI Encoder / Decoder</h2>
          <Badge
            variant="secondary"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            function
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Solidity function signature와 args 또는 calldata 사이를
          BigInt-safe하게 변환합니다.
        </p>
      </header>

      <ModeToggle mode={mode} onChange={setMode} />

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Signature</CardTitle>
          <CardDescription>
            짧은 형식(`transfer(address,uint256)`)과 full form(`function ...`)
            모두 지원합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={SIGNATURE_PLACEHOLDER}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={signature.trim() !== '' && !parsed.ok}
            className={cn(
              'font-mono text-sm',
              signature.trim() !== '' &&
                !parsed.ok &&
                'border-destructive focus-visible:ring-destructive/30',
            )}
          />
          <SignaturePreview signature={signature} result={parsed} />
        </CardContent>
      </Card>

      {mode === 'encode' ? (
        <EncodePanel
          parsed={parsed.ok ? parsed.value : null}
          argsJson={argsJson}
          onArgsJsonChange={setArgsJson}
          result={encodeResult}
          onCopy={handleCopy}
          copyTokens={copyTokens}
        />
      ) : (
        <DecodePanel
          parsed={parsed.ok ? parsed.value : null}
          calldata={calldata}
          onCalldataChange={setCalldata}
          result={decodeResult}
          onCopy={handleCopy}
          copyTokens={copyTokens}
        />
      )}
    </section>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (mode: Mode) => void
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
      {(['encode', 'decode'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            'rounded-sm px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
            mode === m
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

function SignaturePreview({
  signature,
  result,
}: {
  signature: string
  result: ParseResult
}) {
  if (signature.trim() === '') {
    return (
      <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        시그니처를 입력하면 파싱 결과가 표시됩니다.
      </p>
    )
  }

  if (!result.ok) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <span className="text-foreground/90">{result.error}</span>
      </div>
    )
  }

  const { abi, selector, canonical } = result.value
  return (
    <div className="rounded-md border bg-muted/20 px-4 py-3 font-mono text-xs">
      <dl className="grid grid-cols-[5rem_1fr] gap-y-1.5">
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
          function
        </dt>
        <dd>{abi.name}</dd>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
          selector
        </dt>
        <dd>{selector}</dd>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
          canonical
        </dt>
        <dd className="break-all">{canonical}</dd>
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
          inputs
        </dt>
        <dd className="space-y-1">
          {abi.inputs.length === 0 ? (
            <span className="text-muted-foreground">(none)</span>
          ) : (
            abi.inputs.map((input, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground">[{i}]</span>
                <span>{input.type}</span>
                {input.name && (
                  <span className="text-muted-foreground">{input.name}</span>
                )}
              </div>
            ))
          )}
        </dd>
        {abi.outputs && abi.outputs.length > 0 && (
          <>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              outputs
            </dt>
            <dd className="space-y-1">
              {abi.outputs.map((output, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-muted-foreground">[{i}]</span>
                  <span>{output.type}</span>
                  {output.name && (
                    <span className="text-muted-foreground">{output.name}</span>
                  )}
                </div>
              ))}
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}

type CopyHandler = (kind: CopyKind, value: string) => void

function EncodePanel({
  parsed,
  argsJson,
  onArgsJsonChange,
  result,
  onCopy,
  copyTokens,
}: {
  parsed: ParsedSignature | null
  argsJson: string
  onArgsJsonChange: (value: string) => void
  result: ReturnType<typeof encodeCall> | null
  onCopy: CopyHandler
  copyTokens: Set<CopyKind>
}) {
  const argsInvalid =
    parsed !== null && argsJson.trim() !== '' && result !== null && !result.ok

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Encode</CardTitle>
        <CardDescription>
          위 signature의 inputs에 맞춰 args를 JSON 배열로 입력하세요. 큰
          정수는 문자열로 감싸면 정확히 처리됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="abi-args"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            args (JSON array)
          </Label>
          <Textarea
            id="abi-args"
            value={argsJson}
            onChange={(e) => onArgsJsonChange(e.target.value)}
            placeholder={ARGS_PLACEHOLDER}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={argsInvalid}
            className={cn(
              'font-mono text-sm',
              argsInvalid &&
                'border-destructive focus-visible:ring-destructive/30',
            )}
          />
        </div>

        <Separator />

        <OutputBlock
          label="calldata"
          description={
            parsed
              ? `selector + ${parsed.abi.inputs.length}개의 인자가 ABI-encoded됩니다.`
              : '시그니처가 입력되면 표시됩니다.'
          }
          state={
            parsed === null
              ? { kind: 'idle', message: '시그니처가 비어있습니다.' }
              : result === null || (argsJson.trim() === '' && parsed.abi.inputs.length > 0)
                ? { kind: 'idle', message: 'args를 입력하세요.' }
                : result.ok
                  ? {
                      kind: 'value',
                      value: result.calldata,
                      copied: copyTokens.has('calldata'),
                      onCopy: () => onCopy('calldata', result.calldata),
                      extra: (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          selector{' '}
                          <button
                            type="button"
                            onClick={() => onCopy('selector', result.selector)}
                            className="rounded bg-muted px-1.5 py-0.5 text-foreground hover:bg-accent"
                          >
                            {copyTokens.has('selector') ? '✓ ' : ''}
                            {result.selector}
                          </button>
                        </span>
                      ),
                    }
                  : { kind: 'error', message: result.error }
          }
        />
      </CardContent>
    </Card>
  )
}

function DecodePanel({
  parsed,
  calldata,
  onCalldataChange,
  result,
  onCopy,
  copyTokens,
}: {
  parsed: ParsedSignature | null
  calldata: string
  onCalldataChange: (value: string) => void
  result: ReturnType<typeof decodeCall> | null
  onCopy: CopyHandler
  copyTokens: Set<CopyKind>
}) {
  const calldataInvalid =
    parsed !== null && calldata.trim() !== '' && result !== null && !result.ok

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Decode</CardTitle>
        <CardDescription>
          위 signature가 가리키는 함수의 calldata를 디코딩합니다. selector가
          일치하지 않으면 viem이 거절합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="abi-calldata"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            calldata
          </Label>
          <Textarea
            id="abi-calldata"
            value={calldata}
            onChange={(e) => onCalldataChange(e.target.value)}
            placeholder={CALLDATA_PLACEHOLDER}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={calldataInvalid}
            className={cn(
              'font-mono text-sm',
              calldataInvalid &&
                'border-destructive focus-visible:ring-destructive/30',
            )}
          />
        </div>

        <Separator />

        <OutputBlock
          label="decoded args"
          description="bigint는 문자열로 직렬화됩니다."
          state={
            parsed === null
              ? { kind: 'idle', message: '시그니처가 비어있습니다.' }
              : result === null || calldata.trim() === ''
                ? { kind: 'idle', message: 'calldata를 입력하세요.' }
                : result.ok
                  ? {
                      kind: 'value',
                      value: result.argsJson,
                      copied: copyTokens.has('decoded'),
                      onCopy: () => onCopy('decoded', result.argsJson),
                      multiline: true,
                    }
                  : { kind: 'error', message: result.error }
          }
        />
      </CardContent>
    </Card>
  )
}

type OutputState =
  | { kind: 'idle'; message: string }
  | { kind: 'error'; message: string }
  | {
      kind: 'value'
      value: string
      copied: boolean
      onCopy: () => void
      extra?: React.ReactNode
      multiline?: boolean
    }

function OutputBlock({
  label,
  description,
  state,
}: {
  label: string
  description: string
  state: OutputState
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        {state.kind === 'value' && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={state.onCopy}
            className="h-7 px-2"
          >
            {state.copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {state.copied ? 'copied' : 'copy'}
            </span>
          </Button>
        )}
      </div>

      {state.kind === 'idle' && (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {state.message}
        </p>
      )}

      {state.kind === 'error' && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-foreground/90">{state.message}</span>
        </div>
      )}

      {state.kind === 'value' && (
        <>
          {state.multiline ? (
            <pre className="overflow-x-auto rounded-md border bg-muted/30 px-3 py-2.5 font-mono text-xs">
              {state.value}
            </pre>
          ) : (
            <code className="block break-all rounded-md border bg-muted/30 px-3 py-2.5 font-mono text-xs">
              {state.value}
            </code>
          )}
          {state.extra && <div>{state.extra}</div>}
        </>
      )}
    </div>
  )
}
