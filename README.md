# mallang-core-frontend

회사에서의 하루를 함께하는 데스크탑 말랑이 — Electron + React + TypeScript 클라이언트.

## 주요 기능

- **대화형 말랑이 캐릭터** — 데스크탑에 상주하며 자연어 대화 (OpenAI LLM 기반)
- **감정 인식 TTS** — Naver Clova Voice로 말랑이 감정에 맞는 음성 합성
- **음성 입력 (STT)** — 마이크로 말 걸기 (Magovoice 연동)
- **시간 기반 스케줄러** — 출근/점심/퇴근 시간에 자동 메시지
- **점심 투표** — 팀 기반 식당 추천 + 투표 + 우승 식당 표시
- **점심 리뷰** — 식사 후 별점/메모/또갈래 피드백
- **그룹 말랑이** — 팀원 말랑이들이 놀이터에서 돌아다니는 화면
- **마이페이지** — 프로필, 팀 위치, OpenAI 키, TTS/알림 토글 관리
- **온보딩** — 첫 실행 시 대화형 정보 수집

## Stack

- **Electron Forge** (with Vite plugin) + TypeScript
- **React 18**, **React Router** (HashRouter)
- **styled-components** + 자체 테마(`src/renderer/app/theme.ts`)
- **Zustand** (전역 말랑이 상태, 인증, 프로필)
- **TanStack Query** + axios (서버 통신)
- **React Hook Form** + Zod (폼/검증)
- **Framer Motion** + Lottie (캐릭터 애니메이션)

## Requirements

- Node.js 20+
- pnpm 9+ (`corepack enable pnpm` 또는 `npm i -g pnpm`)
- 백엔드 서버 실행 중 (기본 `http://localhost:3000/api`)

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
    │   ├── scheduler/               시간 기반 intent 스케줄러
    │   └── windows/                 BrowserWindow 생성 및 레이아웃
    ├── preload/                     contextBridge로 안전한 API 노출
    ├── shared/                      메인/렌더러 공용 코드
    │   ├── ipc/channels.ts          IPC 채널 이름 한 곳에서 관리
    │   └── types/domain.ts          도메인 타입 정의
    └── renderer/                    React 앱 (렌더러 프로세스)
        ├── main.tsx                 React 진입점
        ├── app/                     Provider / Router / 테마 / 전역 스타일
        ├── features/                도메인 단위 화면
        │   ├── auth/                로그인 / 회원가입
        │   ├── mallang/             데스크탑 캐릭터 (대화/감정/TTS/리뷰카드)
        │   ├── onboarding/          첫 실행 대화형 정보 수집
        │   ├── mypage/              마이페이지 (프로필/키/토글)
        │   ├── group/               그룹 말랑이 놀이터 + 우승 식당
        │   ├── lunch/               점심 투표 화면
        │   └── emotion/             주간 감정 리포트
        ├── shared/                  공용 컴포넌트/훅/스토어/API
        │   ├── api/                 백엔드 API 함수 (auth, chats, tts, teams 등)
        │   ├── audio/               TTS 플레이어, 음성 녹음
        │   ├── stores/              Zustand 스토어 (auth, mallang, profile)
        │   └── scheduler/           스케줄러 동기화 유틸
        └── assets/                  Lottie JSON, 배경 이미지, 아이콘
```

## 윈도우 구조

| 창            | 라우트        | 특징                                    |
| ------------- | ------------- | --------------------------------------- |
| 말랑이 캐릭터 | `/mallang`    | 투명/프레임리스, 우하단 상주, 대화 입력 |
| 마이페이지    | `/mypage`     | 말랑이 좌측 패널, 프로필/설정 관리      |
| 그룹 말랑이   | `/group`      | 말랑이 우측 패널, 팀원 놀이터           |
| 점심 투표     | `/lunch-vote` | 말랑이 상단 패널, 투표 UI               |

- 말랑이 창에 포커스가 오면 패널들도 함께 앞으로 올라옴
- 패널은 말랑이 창 기준 상대 위치에 자동 배치 (`panel-layout.ts`)

## macOS에서 앱이 실행되지 않을 때

미확인 개발자 앱으로 차단되는 경우 아래 방법 중 하나를 사용합니다.

### 방법 1: 시스템 설정에서 허용 (권장)

1. 앱을 더블클릭해서 차단 팝업이 뜨면 **취소**
2. **시스템 설정** → **개인 정보 보호 및 보안** 이동
3. 하단 "Mallang Core이(가) 차단되었습니다" 옆 **확인 없이 열기** 클릭
4. 비밀번호 입력 후 열기

### 방법 2: 우클릭으로 열기

1. Finder에서 앱을 **우클릭** (또는 Control + 클릭)
2. **열기** 선택
3. 경고 팝업에서 **열기** 클릭

### 방법 3: 터미널로 격리 속성 제거

```bash
xattr -cr /Applications/Mallang\ Core.app
```

앱이 다른 경로에 있으면 해당 경로로 변경합니다.

---

## 백로그

- [ ] 주간 감정 리포트 차트 연동
- [ ] 트레이 아이콘 메뉴
- [ ] electron-updater 자동 업데이트
- [ ] Windows 빌드 테스트
