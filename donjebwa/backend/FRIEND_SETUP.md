# 던져봐 백엔드 — 로컬 세팅 가이드 (프론트 담당자용)

이 문서대로만 따라 하면 백엔드 4개 서버가 네 컴퓨터에서 돈다.
파이썬/ADK 처음이어도 괜찮게 단계별로 적었다. **순서대로** 하면 된다.

> 핵심 규칙 (제일 많이 실수하는 부분):
> **새 터미널을 열 때마다 매번 ① backend 폴더로 cd ② 가상환경(venv) 켜기 를 먼저 해야 한다.**
> 프롬프트 앞에 `(.venv)` 가 붙어 있고, 위치가 `...\backend` 인지 항상 확인할 것.

---

## 0. 준비물

- **Python 3.12** 권장 (3.10~3.14 다 됨. 없으면 https://www.python.org/downloads/ 에서 설치.
  설치 시 **"Add Python to PATH" 체크** 꼭 할 것.)
- 주영이 준 **`donjebwa_backend.zip`**
- **Gemini API 키** (아래 5번에서 발급)

설치됐는지 확인 (터미널/PowerShell에서):
```
python --version
```
`Python 3.x.x` 가 나오면 OK. (안 나오면 `python3 --version` 시도)

---

## 1. 압축 풀기

`donjebwa_backend.zip` 을 적당한 곳(예: `D:\Throw`)에 푼다. 그러면 이런 구조가 나온다:

```
donjebwa/
└── backend/        ← 우리가 작업할 폴더
    ├── pyproject.toml
    ├── app/  agents/  core/  orchestrator/ ...
    └── .env.example
```

**`backend` 폴더 위치를 기억해 둘 것.** 예: `D:\Throw\donjebwa\backend`

---

## 2. backend 폴더로 이동

터미널(Windows는 PowerShell)을 열고:
```powershell
cd D:\Throw\donjebwa\backend
```
(네 경로에 맞게. 폴더 안에 `pyproject.toml` 이 보이면 맞게 온 거다. `dir` 로 확인.)

---

## 3. 가상환경(venv) 만들고 켜기

```powershell
python -m venv .venv
```

켜기 (OS별로 다름):
```powershell
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Mac / Linux
source .venv/bin/activate
```

프롬프트 앞에 **`(.venv)`** 가 붙으면 성공.

> Windows에서 `이 시스템에서 스크립트를 실행할 수 없으므로...` 빨간 에러가 나면:
> ```powershell
> Set-ExecutionPolicy -Scope Process -Bypass
> ```
> 치고 다시 `.\.venv\Scripts\Activate.ps1`

---

## 4. 의존성 설치

`(.venv)` 켜진 상태, `backend` 폴더에서:
```powershell
pip install -e .
```
1~3분 걸린다. 끝에 `Successfully installed ...` 가 뜨면 OK.

> 혹시 나중에 `No module named 'a2a.server.apps'` 같은 에러가 나면, a2a 서버 패키지가 빠진 거다. 이걸로 보강:
> ```powershell
> pip install "google-adk[a2a]"
> ```

---

## 5. Gemini API 키 발급 + .env 만들기

**(1) 키 발급** — https://aistudio.google.com/apikey 접속 → "API 키 만들기" → 생성된 키 복사.
- 요즘 키는 `AQ.` 로 시작한다. 정상이다(예전엔 `AIza`). 그대로 쓰면 된다.
- 학교 계정이 막히면 개인 구글 계정으로.

**(2) .env 만들기** — `.env` 는 zip에 없다(비밀이라 일부러 뺌). 템플릿을 복사해서 만든다:
```powershell
# Windows
copy .env.example .env
# Mac / Linux
cp .env.example .env
```

**(3) `.env` 파일을 편집기로 열어서** 아래 두 줄을 이렇게 바꾼다:
```
GEMINI_API_KEY=여기에복사한키
SCHEDULER_ENABLED=false
```
- `GEMINI_API_KEY` : 발급받은 키 붙여넣기 (따옴표·공백 없이)
- `SCHEDULER_ENABLED=false` : **중요.** 안 끄면 60초마다 자동으로 API를 호출해서 토큰을 계속 쓴다. 프론트 개발엔 자동 실행 필요 없으니 꺼 둔다.

**(4) 프론트(Vite) 연동하려면** `.env` 에 이 줄도 추가 (CORS 허용):
```
CORS_ORIGINS=["http://localhost:5173"]
```

저장.

---

## 6. 서버 4개 띄우기 (터미널 4개)

**터미널마다** ① `cd ...backend` ② venv 켜기 를 먼저 한 뒤 명령을 친다.
(예시 경로는 네 환경에 맞게)

**터미널 1 — 장소 에이전트**
```powershell
cd D:\Throw\donjebwa\backend
.\.venv\Scripts\Activate.ps1
uvicorn agents.place_agent.agent:a2a_app --port 8001
```

**터미널 2 — 동선 에이전트**
```powershell
cd D:\Throw\donjebwa\backend
.\.venv\Scripts\Activate.ps1
uvicorn agents.route_agent.agent:a2a_app --port 8002
```

**터미널 3 — 스토리텔러 에이전트**
```powershell
cd D:\Throw\donjebwa\backend
.\.venv\Scripts\Activate.ps1
uvicorn agents.storyteller_agent.agent:a2a_app --port 8003
```

**터미널 4 — 메인 서버**
```powershell
cd D:\Throw\donjebwa\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

각 터미널에 `Application startup complete.` 가 뜨면 그 서버는 정상.

---

## 7. 잘 도는지 확인

브라우저에서:
- `http://localhost:8000/health` → `{"status":"ok"}`
- `http://localhost:8000/docs` → API 문서. 여기서 `POST /api/throw` → **Try it out** → 아래 JSON 넣고 **Execute**:
  ```json
  {"region":"성수","when":"토요일 14시","companion":"커플","mood":"조용한 분위기"}
  ```
  → 코스 + 스토리가 응답으로 오면 백엔드 완전 정상.

> `http://localhost:8003/` 에 직접 들어가면 `Method Not Allowed` 가 뜨는데, **이건 정상**이다(POST만 받는 주소라 그렇다). 서버 살아있다는 뜻.

---

## 8. 프론트 연동

백엔드가 위처럼 돌고 있으면, 네 프론트에서 이 주소들을 부르면 된다:
- `POST http://localhost:8000/api/throw` — 바디 `{region, when, companion, mood}`, 응답에 코스(`stops`)와 `story`
- `GET  http://localhost:8000/api/stream` — SSE. 에이전트 진행 이벤트가 실시간으로 옴 (라이브 패널용)

(연동 코드 상세는 주영한테 "API 연동 가이드" 따로 받을 것.)

---

## 자주 막히는 곳 (= 우리가 실제로 겪은 것들)

| 증상 | 원인 / 해결 |
|---|---|
| `No module named 'agents'` | **폴더 위치 틀림.** `backend` 폴더 안에서 실행해야 함. `cd ...backend` 후 다시. |
| 프롬프트에 `(.venv)` 없음 | venv 안 켬. `.\.venv\Scripts\Activate.ps1` |
| `No module named 'a2a.server.apps'` | `pip install "google-adk[a2a]"` |
| `Could not import module "agents..."` | 보통 위 둘 중 하나. `python -c "import agents.storyteller_agent.agent"` 로 진짜 에러 확인. |
| `.env` 가 없다 | 원래 zip에 없음. `copy .env.example .env` 로 만들기. |
| `/docs` 에서 한글 던졌는데 422 | curl로 한글 보내면 인코딩 깨짐. **`/docs` 화면에서** 던지면 됨. |
| 토큰이 계속 빠짐 | `.env` 의 `SCHEDULER_ENABLED=false` 확인. |

막히면 그 터미널 에러를 통째로 캡처해서 주영한테 보낼 것.
