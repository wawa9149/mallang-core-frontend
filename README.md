# mallang-core-frontend

회사에서의 하루를 함께하는 데스크탑 말랑이 — Electron + React + TypeScript 클라이언트.

## Stack

- **Electron Forge** (with Vite plugin) + TypeScript
- **React 18**, **React Router** (HashRouter)
- **styled-components** + 자체 테마(`src/renderer/app/theme.ts`)
- **Zustand** (전역 말랑이 상태)
- **TanStack Query** + axios (서버 통신)
- **React Hook Form** + Zod (폼/검증)
- **Framer Motion** + Lottie (캐릭터 애니메이션)

## Requirements

- Node.js 20+
- pnpm 9+ (`corepack enable pnpm` 또는 `npm i -g pnpm`)

## Scripts

```bash
pnpm install           # 의존성 설치
pnpm start             # 개발 모드 (말랑이 캐릭터 창 + 메인 창 동시 실행)
pnpm package           # 패키징 (배포 전 검증)
pnpm make              # 플랫폼별 인스톨러 생성 (macOS: dmg/zip, Windows: squirrel)
pnpm lint              # ESLint 검사
pnpm lint:fix          # ESLint 자동 수정
pnpm format            # Prettier 포매팅
pnpm typecheck         # 타입 검사
```

## 프로젝트 구조

```
.
├── forge.config.ts                  Electron Forge 설정 (메이커/플러그인)
├── vite.main.config.ts              메인 프로세스 번들 설정
├── vite.preload.config.ts           preload 번들 설정
├── vite.renderer.config.ts          렌더러(React) 번들 설정
├── index.html                       Vite 렌더러 진입 HTML
└── src/
    ├── main/                        Electron 메인 프로세스
    │   ├── index.ts                 앱 부트스트랩
    │   ├── ipc/                     IPC 핸들러
    │   └── windows/                 캐릭터 창 / 메인 창 생성
    ├── preload/                     contextBridge로 안전한 API 노출
    ├── shared/                      메인/렌더러 공용 코드
    │   ├── ipc/channels.ts          IPC 채널 이름 한 곳에서 관리
    │   └── types/domain.ts          User/Mallang/EmotionLog 등 도메인 타입
    └── renderer/                    React 앱 (렌더러 프로세스)
        ├── main.tsx                 React 진입점
        ├── app/                     Provider / Router / 테마 / 전역 스타일
        ├── features/                도메인 단위 화면
        │   ├── mallang/             데스크탑 캐릭터 (드래그/클릭/말풍선)
        │   ├── onboarding/          최초 사용자 조사
        │   ├── settings/            설정 화면
        │   ├── lunch/               점심 추천/투표/리뷰
        │   └── emotion/             주간 감정 리포트
        ├── shared/                  공용 컴포넌트/훅/스토어/API
        └── assets/                  Lottie JSON, SVG, 아이콘
```

## 윈도우 구조

- **말랑이 캐릭터 창** (`/mallang`): 투명/프레임리스/항상 위, 우하단 상주
- **메인 창** (`/onboarding`, `/settings`, `/lunch/vote`, `/emotion/report`): 일반 창

캐릭터 창에서 톱니바퀴 아이콘을 누르면 메인 창의 `/settings` 라우트가 열린다.

## 다음 작업 (MVP 백로그)

- [ ] 온보딩 폼 (시간/취향/취미)
- [ ] 시간 기반 메시지 스케줄러 (메인 프로세스 cron)
- [ ] 점심 추천/투표 API 연동
- [ ] 점심 리뷰 입력
- [ ] 퇴근/야근 체크 모달
- [ ] 주간 감정 리포트 차트
- [ ] 트레이 아이콘 메뉴
- [ ] electron-updater 연동
