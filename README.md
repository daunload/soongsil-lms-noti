# soongsil-email-noti

숭실대학교 LMS(Canvas)의 미완료 항목을 이메일로 자동 알림해주는 도구입니다.

## 기능

- **과제**: 제출하지 않은 과제 목록 및 마감까지 남은 시간
- **동영상**: 수강하지 않은 강의 영상
- **퀴즈**: 응시하지 않은 퀴즈
- **토론**: 참여하지 않은 토론

| 모드 | 동작 | 스케줄 |
|------|------|--------|
| `daily` | 미완료 항목 전체 발송 | 매일 09:00 KST |
| `deadline` | 24시간 내 마감 항목이 있을 때만 발송 | 6시간마다 |

---

## 사용 방법 (Fork 기준)

### 1. 저장소 Fork

이 저장소를 본인의 GitHub 계정으로 Fork합니다.

### 2. Gmail 앱 비밀번호 발급

Google 계정의 2단계 인증을 활성화한 뒤, [앱 비밀번호](https://myaccount.google.com/apppasswords)를 발급합니다. 발급받은 16자리 비밀번호를 아래 `AUTHPASS`에 사용합니다.

### 3. GitHub Secrets 등록

Fork한 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 아래 항목을 등록합니다.

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `SSU_ID` | 숭실대 학번 | `20201234` |
| `SSU_PW` | 숭실대 포털 비밀번호 | |
| `AUTHUSER` | 발신 Gmail 주소 | `you@gmail.com` |
| `AUTHPASS` | Gmail 앱 비밀번호 | `abcd efgh ijkl mnop` |
| `NOTIFY_EMAIL` | 알림을 받을 이메일 주소 | `you@example.com` |

### 4. Actions 활성화

Fork한 저장소에서는 GitHub Actions가 기본적으로 비활성화되어 있습니다.  
**Actions 탭 → "I understand my workflows, go ahead and enable them"** 을 클릭해 활성화합니다.

이후 스케줄에 따라 자동으로 실행됩니다. 즉시 테스트하려면 **Actions → Daily LMS Notification (또는 Deadline Alert) → Run workflow**를 클릭합니다.

---

## 로컬에서 실행하기 (선택)

```bash
# Node.js 20 이상 필요
npm install
npx playwright install chromium --with-deps

cp .env.example .env
# .env 파일을 열어 값 입력 후 실행
npm start             # daily 모드
npm run start:deadline  # deadline 모드
```

브라우저 동작을 눈으로 확인하려면 `.env`에 다음을 추가합니다.

```
PLAYWRIGHT_HEADLESS=false
```
