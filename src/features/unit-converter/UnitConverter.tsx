import { useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Check,
  Copy,
  RotateCcw,
  TriangleAlert,
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
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  UNIT_DECIMALS,
  UNIT_LABEL,
  formatAmount,
  isValidDecimals,
  parseAmount,
} from './units'
import type { Unit } from './units'

type Field = Unit | 'custom'

const COMMON_DECIMALS: Array<{ label: string; value: number }> = [
  { label: 'USDC / USDT', value: 6 },
  { label: 'WBTC', value: 8 },
  { label: 'DAI / WETH', value: 18 },
]

const DEFAULT_CUSTOM_DECIMALS = 6

function fieldDecimals(field: Field, customDecimals: number): number {
  return field === 'custom' ? customDecimals : UNIT_DECIMALS[field]
}

function deriveInputs(
  source: Field,
  raw: string,
  wei: bigint,
  customDecimals: number,
): Record<Field, string> {
  return {
    wei: source === 'wei' ? raw : formatAmount(wei, UNIT_DECIMALS.wei),
    gwei: source === 'gwei' ? raw : formatAmount(wei, UNIT_DECIMALS.gwei),
    ether: source === 'ether' ? raw : formatAmount(wei, UNIT_DECIMALS.ether),
    custom: source === 'custom' ? raw : formatAmount(wei, customDecimals),
  }
}

export function UnitConverter() {
  const [wei, setWei] = useState<bigint>(0n)
  const [inputs, setInputs] = useState<Record<Field, string>>({
    wei: '0',
    gwei: '0',
    ether: '0',
    custom: '0',
  })
  const [errorField, setErrorField] = useState<Field | null>(null)
  const [customDecimals, setCustomDecimals] = useState(DEFAULT_CUSTOM_DECIMALS)
  const [customDecimalsInput, setCustomDecimalsInput] = useState(
    String(DEFAULT_CUSTOM_DECIMALS),
  )
  const [copyTokens, setCopyTokens] = useState<Set<Field>>(() => new Set())
  const copyTimers = useRef<Map<Field, number>>(new Map())

  function handleChange(field: Field, value: string) {
    const decimals = fieldDecimals(field, customDecimals)
    const parsed = parseAmount(value, decimals)

    if (parsed.ok) {
      setWei(parsed.wei)
      setInputs(deriveInputs(field, value, parsed.wei, customDecimals))
      setErrorField(null)
      return
    }

    setInputs((prev) => ({ ...prev, [field]: value }))
    setErrorField(parsed.reason === 'empty' ? null : field)
  }

  function handleCustomDecimalsChange(rawValue: string) {
    setCustomDecimalsInput(rawValue)
    const parsed = Number.parseInt(rawValue, 10)
    if (!isValidDecimals(parsed)) return
    setCustomDecimals(parsed)
    setInputs((prev) => ({ ...prev, custom: formatAmount(wei, parsed) }))
    if (errorField === 'custom') setErrorField(null)
  }

  function applyCommonDecimals(value: number) {
    setCustomDecimalsInput(String(value))
    setCustomDecimals(value)
    setInputs((prev) => ({ ...prev, custom: formatAmount(wei, value) }))
    if (errorField === 'custom') setErrorField(null)
  }

  function handleReset() {
    setWei(0n)
    setInputs({ wei: '0', gwei: '0', ether: '0', custom: '0' })
    setErrorField(null)
  }

  function handleCopy(field: Field, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopyTokens((prev) => {
        const next = new Set(prev)
        next.add(field)
        return next
      })
      const existing = copyTimers.current.get(field)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setCopyTokens((prev) => {
          const next = new Set(prev)
          next.delete(field)
          return next
        })
        copyTimers.current.delete(field)
      }, 1500)
      copyTimers.current.set(field, timer)
    })
  }

  const customValid = isValidDecimals(Number.parseInt(customDecimalsInput, 10))

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-foreground" />
          <h2 className="text-xl font-semibold">Unit Converter</h2>
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
            bigint
          </Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          wei · gwei · ether 사이를 BigInt 기반으로 정밀하게 변환합니다. 임의
          decimals(ERC-20 등) 변환도 함께 지원합니다.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">EVM 표준 단위</CardTitle>
            <CardDescription>
              어느 필드를 수정해도 나머지가 자동 갱신됩니다.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="size-3.5" />
            0으로 리셋
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['ether', 'gwei', 'wei'] as const).map((unit) => (
            <UnitField
              key={unit}
              field={unit}
              label={UNIT_LABEL[unit]}
              value={inputs[unit]}
              decimals={UNIT_DECIMALS[unit]}
              isError={errorField === unit}
              copied={copyTokens.has(unit)}
              onChange={(v) => handleChange(unit, v)}
              onCopy={() => handleCopy(unit, inputs[unit])}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">사용자 정의 decimals</CardTitle>
          <CardDescription>
            ERC-20 토큰 등 임의 자릿수의 단위로 변환합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-decimals" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              decimals (0 – 77)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="custom-decimals"
                type="number"
                inputMode="numeric"
                min={0}
                max={77}
                step={1}
                value={customDecimalsInput}
                onChange={(e) => handleCustomDecimalsChange(e.target.value)}
                className={cn(
                  'w-24 font-mono',
                  !customValid && 'border-destructive focus-visible:ring-destructive/30',
                )}
              />
              <Separator orientation="vertical" className="h-6" />
              {COMMON_DECIMALS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyCommonDecimals(preset.value)}
                  className={cn(
                    'h-7 px-2.5 font-mono text-[11px]',
                    customDecimals === preset.value && 'border-foreground/40 bg-accent',
                  )}
                >
                  {preset.value}{' '}
                  <span className="text-muted-foreground">{preset.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <UnitField
            field="custom"
            label={`custom (10^${customDecimals} wei)`}
            value={inputs.custom}
            decimals={customDecimals}
            isError={errorField === 'custom'}
            copied={copyTokens.has('custom')}
            onChange={(v) => handleChange('custom', v)}
            onCopy={() => handleCopy('custom', inputs.custom)}
          />
        </CardContent>
      </Card>
    </section>
  )
}

type UnitFieldProps = {
  field: Field
  label: string
  value: string
  decimals: number
  isError: boolean
  copied: boolean
  onChange: (value: string) => void
  onCopy: () => void
}

function UnitField({
  field,
  label,
  value,
  decimals,
  isError,
  copied,
  onChange,
  onCopy,
}: UnitFieldProps) {
  const inputId = `unit-${field}`

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label
          htmlFor={inputId}
          className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </Label>
        {isError && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <TriangleAlert className="size-3" />
            올바르지 않은 값
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          id={inputId}
          inputMode={decimals === 0 ? 'numeric' : 'decimal'}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={isError}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'pr-10 font-mono text-sm',
            isError && 'border-destructive focus-visible:ring-destructive/30',
          )}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onCopy}
          aria-label={`${field} 값 복사`}
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
        >
          {copied ? (
            <Check className="size-3.5 text-foreground" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
