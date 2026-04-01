soongsil-lms-notifier 기획 및 구현 플랜

     Context

     숭실대 Canvas LMS에서 미완료 항목(과제, 영상, 퀴즈, 토론, 공지)을 자동으로 체크하여 이메일로 알림을 보내는 독립 프로젝트. 기존 soongsil-lms-downloader 프로젝트에서 파악한 Canvas LMS API 엔드포인트와 인증 방식을 재활용한다. GitHub Actions로 스케줄 실행.

     ---
     새 레포 정보

     - 레포명: soongsil-lms-notifier
     - 언어: Node.js + TypeScript
     - 런타임: GitHub Actions node:20

     ---
     프로젝트 구조

     soongsil-lms-notifier/
     ├── src/
     │   ├── index.ts        # 진입점 (오케스트레이터)
     │   ├── auth.ts         # Playwright SSO 로그인 → 쿠키 추출
     │   ├── api.ts          # Canvas LMS API 호출
     │   ├── checker.ts      # 미완료 항목 판별 로직
     │   ├── email.ts        # Nodemailer Gmail SMTP 발송
     │   ├── template.ts     # HTML 이메일 템플릿
     │   └── types.ts        # 공통 타입 정의
     ├── .github/
     │   └── workflows/
     │       ├── daily.yml       # 매일 오전 9시 KST
     │       └── deadline.yml    # 6시간마다 (마감 임박 시만 발송)
     ├── package.json
     ├── tsconfig.json
     └── .env.example

     ---
     GitHub Secrets

     ┌──────────────┬────────────────────┐
     │      키      │        설명        │
     ├──────────────┼────────────────────┤
     │ SSU_ID       │ 숭실대 학번        │
     ├──────────────┼────────────────────┤
     │ SSU_PW       │ SSO 비밀번호       │
     ├──────────────┼────────────────────┤
     │ GMAIL_USER   │ 발신 Gmail 주소    │
     ├──────────────┼────────────────────┤
     │ GMAIL_APP_PW │ Gmail App Password │
     ├──────────────┼────────────────────┤
     │ NOTIFY_EMAIL │ 수신 이메일 주소   │
     └──────────────┴────────────────────┘

     ---
     데이터 흐름

     index.ts
       └─ auth.ts
            → Playwright headless로 canvas.ssu.ac.kr 접속
            → 숭실대 SSO 로그인 (SSU_ID / SSU_PW)
            → canvas.ssu.ac.kr/?login_success=1 감지
            → 쿠키 전체 추출 (xn_api_token 포함)
       └─ api.ts
            → GET /api/v1/dashboard/dashboard_cards          (수강 과목 목록)
            → GET /learningx/api/v1/courses/{id}/modules?include_detail=true
            → GET /api/v1/courses/{id}/assignments?include[]=submission
            → GET /api/v1/courses/{id}/quizzes
            → GET /api/v1/courses/{id}/discussion_topics
            → GET /api/v1/courses/{id}/announcements
       └─ checker.ts   → 미완료 항목 필터링
       └─ email.ts     → HTML 이메일 구성 및 Gmail 발송

     인증 방식: Playwright로 로그인 후 context.cookies()로 쿠키 배열 추출 → 이후 모든 API 호출 시 Cookie: ... 헤더로 포함.

     ---
     미완료 판별 기준

     ┌──────┬──────────────────────────────────────────────────────────────────────────┐
     │ 항목 │                                판별 방법                                 │
     ├──────┼──────────────────────────────────────────────────────────────────────────┤
     │ 과제 │ submission.workflow_state !== 'submitted' + 마감일 미경과                │
     ├──────┼──────────────────────────────────────────────────────────────────────────┤
     │ 영상 │ 모듈 completion_requirement + completed: false (Canvas module items API) │
     ├──────┼──────────────────────────────────────────────────────────────────────────┤
     │ 퀴즈 │ quiz_submission 없거나 workflow_state !== 'complete'                     │
     ├──────┼──────────────────────────────────────────────────────────────────────────┤
     │ 토론 │ 내 user_id로 작성한 entry가 없는 required 토론                           │
     ├──────┼──────────────────────────────────────────────────────────────────────────┤
     │ 공지 │ 최근 7일 이내 공지 목록 (읽음 여부 무관하게 요약 제공)                   │
     └──────┴──────────────────────────────────────────────────────────────────────────┘

     ▎ ⚠️  영상 시청 여부는 Canvas module_item_completion_requirements 응답에 의존. 실제 응답에 completion 데이터가 없으면 "미확인" 상태로 폴백 처리.

     ---
     GitHub Actions 스케줄

     daily.yml — 매일 오전 9시 KST

     on:
       schedule:
         - cron: '0 0 * * *'   # 00:00 UTC = 09:00 KST
       workflow_dispatch:        # 수동 실행 지원
     - 모든 미완료 항목 전체 요약 발송
     - 항목이 없어도 "모두 완료!" 이메일 발송

     deadline.yml — 6시간마다

     on:
       schedule:
         - cron: '0 0,6,12,18 * * *'
       workflow_dispatch:
     - 24시간 이내 마감 항목이 있을 때만 발송
     - 항목 없으면 발송 안 함

     ---
     이메일 형식

     Subject: [LMS 알림] 2026-04-01 — 미완료 12개 / 🚨 마감 임박 2개

     📚 과제 (3개)
       🚨 [데이터구조] 중간 프로젝트 — 마감 4/2 23:59 (오늘!)
       ⚠️  [소프트웨어공학] 1주차 과제 — 마감 4/4 23:59 (3일 후)
          [운영체제] 독후감 — 마감 4/10 23:59

     🎬 영상 (5개)
       [소프트웨어공학] 2주차 강의 (45분)
       ...

     ❓ 퀴즈 (1개)
     💬 토론 (1개)
     📢 공지 (2개, 최근 7일)

     ---
     주요 의존성

     {
       "playwright": "최신",         // SSO 로그인 자동화
       "nodemailer": "최신",         // Gmail SMTP 발송
       "tsx": "최신",                // TypeScript 직접 실행
       "typescript": "최신"
     }

     ---
     구현 순서

     1. 레포 초기화 — package.json, tsconfig.json, .env.example
     2. src/types.ts — Course, Assignment, VideoItem, QuizItem 등 타입
     3. src/auth.ts — Playwright SSO 로그인 + 쿠키 추출
     4. src/api.ts — Canvas API 호출 함수 모음 (쿠키 헤더 포함)
     5. src/checker.ts — 미완료 항목 필터링 로직
     6. src/template.ts — HTML 이메일 템플릿 생성
     7. src/email.ts — Nodemailer Gmail SMTP 설정 + 발송
     8. src/index.ts — 전체 흐름 오케스트레이션
     9. .github/workflows/daily.yml — 매일 실행 워크플로우
     10. .github/workflows/deadline.yml — 마감 임박 워크플로우

     ---
     검증 방법

     1. 로컬에서 .env 파일에 실제 계정 정보 입력 후 npx tsx src/index.ts 실행
     2. Playwright가 브라우저를 열어 SSO 로그인 완료하는지 확인
     3. 이메일 수신 및 항목 목록 정확성 확인
     4. GitHub Actions에서 workflow_dispatch로 수동 트리거하여 동작 확인
     5. deadline.yml은 마감 임박 항목이 없을 때 발송 안 되는지 확인
