import { Link, useParams } from 'react-router'
import { ArrowLeft, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getToolBySlug, toolHref } from '@/data/tools'
import { NotFound } from './NotFound'

export function ComingSoonPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const tool = getToolBySlug(slug)

  if (!tool) {
    return <NotFound />
  }

  const Icon = tool.icon

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg border bg-muted/40">
            <Icon className="size-6" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tool.name}
              </h1>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] uppercase tracking-wider"
              >
                coming soon
              </Badge>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {tool.category} · /tools/{tool.slug}
            </p>
          </div>
        </div>
        <p className="max-w-2xl text-base text-muted-foreground">
          {tool.description}
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-5">
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">아직 구현 중이에요.</p>
          <p className="text-muted-foreground">
            이 도구는 카탈로그에는 올라와 있지만 아직 동작하지 않습니다. 그
            동안에는 사용 가능한 다른 도구를 확인해보세요.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-3.5" />홈으로
          </Link>
        </Button>
        <Button asChild>
          <Link to={toolHref('key-generator')}>Key Pair Generator 사용하기</Link>
        </Button>
      </div>
    </div>
  )
}
