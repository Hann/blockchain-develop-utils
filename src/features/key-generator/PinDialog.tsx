import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { shortenAddress } from './crypto'
import type { Hex } from './types'

type PinDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  address?: Hex
  initialLabel?: string
  onSubmit: (label: string) => void
}

export function PinDialog({
  open,
  onOpenChange,
  mode,
  address,
  initialLabel = '',
  onSubmit,
}: PinDialogProps) {
  const [label, setLabel] = useState(initialLabel)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '키 핀 저장' : '라벨 수정'}
          </DialogTitle>
          <DialogDescription>
            {address ? (
              <>
                <span className="font-mono">{shortenAddress(address)}</span>{' '}
                주소에 사용할 라벨을 입력하세요.
              </>
            ) : (
              '이 키에 사용할 라벨을 입력하세요.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin-label">라벨</Label>
            <Input
              id="pin-label"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: Local test wallet A"
              maxLength={60}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={label.trim().length === 0}>
              {mode === 'create' ? '핀 저장' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
