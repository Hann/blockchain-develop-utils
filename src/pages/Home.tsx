import { Link } from 'react-router'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toolHref, tools } from '@/data/tools'

export function Home() {
  const readyTools = tools.filter((t) => t.status === 'ready')
  const upcomingTools = tools.filter((t) => t.status === 'soon')

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <Badge variant="outline" className="rounded-full font-mono text-[10px] uppercase tracking-wider">
          dev tools · 2026
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          블록체인 개발자를 위한
          <br />
          작은 도구들
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          매일 쓰는 키 생성, 주소 체크섬, 인코딩 변환, 서명 검증 같은 일을 한
          곳에서 처리합니다. 좌측 사이드바에서 도구를 선택하세요.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            available · {readyTools.length}
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            ready to use
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {readyTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.slug}
                to={toolHref(tool.slug)}
                className="group relative flex items-start gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-accent/30"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{tool.name}</h3>
                    <Badge className="font-mono text-[10px] uppercase tracking-wider">
                      ready
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                  <div className="flex items-center gap-1 pt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {tool.category}
                    <span className="ml-auto inline-flex items-center gap-0.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      open
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            roadmap · {upcomingTools.length}
          </h2>
          <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3" />
            coming soon
          </span>
        </div>

        <ul className="divide-y rounded-lg border">
          {upcomingTools.map((tool) => {
            const Icon = tool.icon
            return (
              <li key={tool.slug}>
                <Link
                  to={toolHref(tool.slug)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tool.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tool.category}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-dashed bg-muted/20 px-5 py-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-[11px] uppercase tracking-wider text-foreground">
            tip
          </span>{' '}
          <span className="font-mono">⌘ B</span> 단축키로 사이드바를 접거나
          펼칠 수 있어요.
        </p>
      </section>

      <div className="flex">
        <Button asChild>
          <Link to={toolHref('key-generator')}>Key Pair Generator 열기</Link>
        </Button>
      </div>
    </div>
  )
}
