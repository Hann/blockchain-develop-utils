import { Link, useLocation } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFound() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-4">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        404 · not found
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">
        존재하지 않는 페이지입니다
      </h1>
      <p className="text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {pathname}
        </code>{' '}
        에 해당하는 도구를 찾을 수 없어요.
      </p>
      <Button variant="outline" asChild>
        <Link to="/">
          <ArrowLeft className="size-3.5" />홈으로
        </Link>
      </Button>
    </div>
  )
}
