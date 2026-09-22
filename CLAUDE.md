# Blockchain Dev Utils — 작업 규칙

블록체인 개발자를 위한 유틸리티 도구 모음 웹페이지. React + Vite + TypeScript + shadcn/ui 기반.

## 패키지 매니저

- **pnpm 전용** (`packageManager: pnpm@10.18.3` 핀됨). `npm`, `yarn` 명령 금지.
- 의존성 추가: `pnpm add <pkg>` / `pnpm add -D <pkg>`
- 스크립트: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`

## UI 규칙

### frontend-design 스킬

- **신규 UI 작업은 `frontend-design` 스킬을 먼저 로드하고 시작.** 적용 대상:
  - 새 페이지/뷰/도구 화면 추가
  - 페이지 단위 레이아웃 재설계
  - 기능별 compound 컴포넌트 (예: 폼 그룹, 카드 그룹, 다이얼로그 흐름) 신규 작성
- 스킬 호출이 **불필요한** 경우:
  - 기존 컴포넌트의 사소한 수정 (텍스트 변경, 패딩 미세 조정, 색 토큰 교체)
  - `pnpm dlx shadcn@latest add <name>`으로 단일 프리미티브를 받아 그대로 사용
  - 버그 수정·리팩터링·테스트 작성
- 호출 시 디자인 산출물 톤은 본 문서의 다른 UI 규칙(shadcn/색상 토큰/아이콘)을 따른다. 스킬 가이드와 충돌하면 본 문서 규칙 우선.

### shadcn/ui

- **모든 UI 컴포넌트는 shadcn/ui 사용.** 직접 HTML/CSS로 버튼·카드·인풋 등을 만들지 말 것.
- 설정: `components.json` — style `radix-nova`, baseColor `neutral`, icon `lucide`.
- 컴포넌트 추가는 반드시 CLI로:
  ```
  pnpm dlx shadcn@latest add <component>
  ```
  예: `dialog`, `tabs`, `tooltip`, `sonner`, `select`, `dropdown-menu`.
- **shadcn CLI가 생성한 파일은 vendor 취급.** 직접 수정 금지. 동작을 바꾸고 싶으면 래퍼 컴포넌트를 새로 만들어 그 안에서 합성. 적용 대상:
  - `src/components/ui/**`
  - `src/hooks/use-mobile.ts` 등 CLI가 함께 떨군 훅
- 컴포넌트 import는 alias 경로 사용: `import { Button } from '@/components/ui/button'`.

### 디자인 토큰 / 색상

- **Tailwind 시맨틱 토큰만 사용**: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive` 등.
- `text-gray-500`, `bg-zinc-900`, `#ff0000` 같은 raw 색상 클래스/hex 금지 (다크모드 토큰이 깨짐).
- 새 토큰이 필요하면 `src/index.css`의 `@theme inline` + `:root` / `.dark` 블록에 함께 추가.

### 아이콘

- **lucide-react만 사용.** heroicons / react-icons / 이모지 아이콘 도입 금지.
- 카드 사이즈: `className="size-4"` 또는 `size-5` 기준.

### 폰트

- Geist Variable (`@fontsource-variable/geist`)이 `index.css`에서 import 되어 `--font-sans`로 바인딩됨. 추가 폰트 도입 전에 한 번 더 확인.

## TypeScript

- TS 6 + `moduleResolution: bundler` 환경. `baseUrl` 사용 금지 (deprecated). `paths`만으로 alias 동작.
- 경로 alias: `@/*` → `./src/*`.
- `verbatimModuleSyntax: true` — 타입 전용 import는 반드시 `import type { Foo } from '...'`.
- `erasableSyntaxOnly: true` — enum, parameter properties, namespace 사용 불가. `const` 객체 또는 union 타입으로 대체.
- `noUnusedLocals` / `noUnusedParameters` 활성화 — 미사용 변수 남기지 말 것.

## 디렉토리 구조

```
src/
  components/
    ui/         # shadcn 생성 파일 (수정 금지)
    <feature>/  # 도구별 컴포넌트는 여기 또는 src/features/<name>/
  lib/
    utils.ts    # cn() 등 shadcn 유틸
  App.tsx       # 도구 카탈로그 (허브 페이지)
  main.tsx
  index.css     # Tailwind v4 + 테마 토큰
```

- 새 도구 페이지/화면을 추가할 때는 `src/features/<tool-name>/` 또는 `src/pages/<tool-name>/` 아래에 모으는 것을 우선 검토 (App.tsx 비대화 방지).

## 빌드 / 린트

- `pnpm build` = `tsc -b && vite build`. PR 머지 전 반드시 통과해야 함.
- `pnpm lint`는 ESLint flat config 사용.
- `src/components/ui/**`에 대해서만 `react-refresh/only-export-components` 규칙이 off — 다른 곳에서는 컴포넌트 파일에 상수/유틸을 같이 export하지 말 것.

## 테스트

### 프레임워크

- **Vitest + @testing-library/react + @testing-library/user-event + jsdom.** 그 외(Jest, Mocha, Karma) 도입 금지.
- 설정이 아직 없다면 신규 테스트 작성 전 다음을 함께 셋업한다:
  ```
  pnpm add -D vitest @vitest/coverage-v8 @testing-library/react \
              @testing-library/user-event @testing-library/jest-dom jsdom
  ```
  - `vite.config.ts`에 `test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' }` 추가
  - `package.json`에 `"test": "vitest"`, `"test:run": "vitest run"`, `"test:cov": "vitest run --coverage"` 추가
  - `src/test/setup.ts`에서 `import '@testing-library/jest-dom'` 로딩
- 그 외 테스트 인프라(snapshot, MSW, Playwright E2E)는 필요 발생 시 별도 합의 후 도입.

### 무엇을 테스트하는가 (필수)

다음에 해당하면 **테스트를 함께 작성**해야 머지 가능:
- 순수 로직 함수 (`*/crypto.ts`, `*/utils.ts`, `lib/`의 헬퍼 등) — 입력·경계·예외 케이스 포함
- 사용자 데이터를 영속화하거나 외부 API(localStorage, fetch, Web Crypto)와 상호작용하는 코드 — 영속 데이터 스키마 검증, 손상된 데이터 복구 경로까지
- 폼 검증, 상태 전이, 분기가 있는 React 훅·컴포넌트 — 유저 인터랙션 기준(`userEvent`)으로
- 키·서명·해시·주소 변환처럼 **잘못되면 사용자 자산 위험이 있는 로직** — 정상 케이스 + 알려진 테스트 벡터(EIP, BIP 등 표준 fixture) 필수

### 테스트 생략 가능

- shadcn 원본 컴포넌트(`src/components/ui/**`) — vendor 코드로 취급
- 단순 JSX 렌더 / 정적 마크업 / 레이아웃 시각 검증 (시각은 사람이 본다)
- 외부 라이브러리가 보장하는 동작의 재검증 (예: viem 함수 호출이 정상이라고 가정한 코드의 wrapper)

### 위치 및 명명

- **co-locate**: 테스트 파일은 대상 옆에 `<name>.test.ts(x)`로 둔다.
  - `src/features/key-generator/crypto.ts` ↔ `src/features/key-generator/crypto.test.ts`
- 통합/시나리오 테스트가 별도로 필요하면 `src/test/<scenario>.test.tsx`에 분리.
- `__tests__/` 디렉토리는 만들지 않는다.

### 작성 원칙

- 행위 기반 — 구현 디테일이 아니라 사용자/호출자가 관찰 가능한 결과를 검증한다.
- 컴포넌트 테스트는 `getByRole` / `findByRole` / `getByLabelText` 우선. `getByTestId`는 다른 방법이 전부 실패할 때만.
- `userEvent` 사용. `fireEvent`는 키 입력·포커스 등 userEvent로 표현 안 되는 케이스에만.
- 시간·랜덤·`crypto.randomUUID` 등 비결정적 요소는 `vi.useFakeTimers()` / `vi.spyOn(crypto, 'randomUUID')`로 결정화.
- localStorage 테스트는 `beforeEach`에서 `window.localStorage.clear()`.

### 커버리지

- 강제 % 임계값은 두지 않는다 (체크리스트 작성용으로 변질되기 쉬움).
- 대신 PR 리뷰에서 "필수 테스트 대상" 체크리스트가 누락 없이 채워졌는지를 본다.
- `pnpm test:cov`는 도구로 활용 — 우연히 빠진 분기를 찾는 용도.

## 절대 하지 말 것

- `src/components/ui/**` 파일 직접 수정
- `tailwind.config.js` 생성 (Tailwind v4는 CSS-first, 설정은 `index.css`에서)
- raw 색상 hex / `text-gray-*` 류 사용
- 새 UI 패턴을 손으로 구현 (먼저 shadcn 레지스트리에 해당 컴포넌트가 있는지 확인)
- enum, `namespace`, parameter property 등 erasable-only 위반 문법
- "필수 테스트 대상"에 해당하는 로직을 테스트 없이 머지
- 실패하는 테스트를 `skip` / `only` / 주석 처리로 우회 (원인 수정 후 재시도)
