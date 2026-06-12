# 던져봐 (Donjebwa)

A2A 멀티에이전트 기반 여행·데이트 코스 추천 서비스 백엔드.
"던지면" AI 에이전트들이 협업해 하루 코스를 짜고, 결과를 노션 '운명 일지'에 기록한다.

## 두 가지 동작

**시나리오 1 — 완전 자동 (무인 큐레이션)**
스케줄러가 주기적으로 지역을 추첨 → 장소·동선·스토리 에이전트가 협업 → 노션에 자동 적재.
사람이 아무것도 누르지 않아도 결과가 쌓인다. (자동처리 + SaaS 연동 증명)

**시나리오 2 — 사용자 입력 (협상)**
지역·시간·동행·취향을 입력 → 동선 에이전트가 혼잡으로 코스를 '반려' → 오케스트레이터가
장소 에이전트에 재요청 → 한산한 코스로 통과 → 동행 톤에 맞춘 스토리 생성.
(WorkFlow · A2A · Orchestration + 개인화 증명)

## 아키텍처

```
                    ┌─────────────────────────────┐
   프론트(Next.js) ─┤  FastAPI (app/)  :8000      │
                    │   /throw  /stream(SSE)       │
                    └───────────────┬──────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │  Orchestrator                 │
                    │  - 지역 추첨(draw)            │
                    │  - 협상 루프(negotiation)     │
                    │  - 이벤트 중계(events→SSE)    │
                    └───┬───────────┬───────────┬───┘
              A2A(JSON-RPC)     A2A          A2A
                    │           │             │
              ┌─────▼───┐ ┌─────▼─────┐ ┌─────▼────────┐
              │ 장소     │ │ 동선 검증  │ │ 스토리텔러    │
              │ :8001   │ │ :8002     │ │ :8003        │
              │(캐시/API)│ │(혼잡 반려)│ │(Gemini)      │
              └─────────┘ └───────────┘ └──────────────┘
                                    │
                            ┌───────▼────────┐
                            │ Notion 운명일지 │
                            └────────────────┘
```

오케스트레이터가 추첨·협상을 명시적 파이썬으로 제어하고, 3개 에이전트는 각각
독립 A2A 서버로 떠서 JSON-RPC로 통신한다.

## 기술 스택

- **API**: FastAPI, SSE(sse-starlette)
- **에이전트/통신**: Google ADK, A2A 프로토콜(JSON-RPC)
- **LLM**: Gemini 3.1 Flash-Lite (스토리텔러)
- **DB**: SQLAlchemy + SQLite
- **스케줄러**: APScheduler
- **연동**: Notion API

## 디렉토리

```
app/            FastAPI (라우터·SSE·배선)
orchestrator/   흐름 제어 + 추첨 + 협상 + A2A 클라이언트
agents/         ADK A2A 에이전트 3종 (place / route / storyteller)
core/           설정·DB·모델·로깅
integrations/   외부 연동 (notion 외)
scheduler/      시나리오 1 자동 큐레이션
data/           추첨 지역 풀 + 장소 캐시
```

## 설치 & 실행 (로컬)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -e .
cp .env.example .env          # GEMINI_API_KEY 등 채우기
```

에이전트 3개 + 메인을 각각 별도 터미널에서 띄운다(각 터미널 venv 활성화):

```bash
uvicorn agents.place_agent.agent:a2a_app       --port 8001
uvicorn agents.route_agent.agent:a2a_app       --port 8002
uvicorn agents.storyteller_agent.agent:a2a_app --port 8003
uvicorn app.main:app --reload --port 8000
```

## 실행 (도커)

```bash
cd backend
docker compose up --build      # 4개 컨테이너 한 번에
```

## 환경변수 (.env)

| 키 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio 키 (스토리텔러 필수) |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |
| `NOTION_TOKEN` / `NOTION_DB_ID` | 노션 적재 (비우면 스텁 처리) |
| `DEMO_MODE` | `true`면 외부 API 대신 캐시 사용 |
| `SCHEDULER_ENABLED` | 시나리오 1 자동 큐레이션 on/off |
| `*_AGENT_URL` | 각 에이전트 주소 (도커는 compose가 override) |

## 데모

**스토리텔러 단독 점검**
```bash
python test_agent.py          # {"story": "..."} 나오면 OK
```

**시나리오 2 (협상)** — 4개 다 띄운 상태에서:
```
POST http://localhost:8000/api/throw
{"region":"성수","when":"토요일 14시","companion":"커플","mood":"조용한 분위기"}
```
진행 과정은 `http://localhost:8000/api/stream` (SSE)에서 실시간 관찰.
동선 반려 → 장소 재요청 → 통과 이벤트가 순서대로 흐른다.

## 과제 평가 항목 매핑

| 요구사항 | 구현 |
|---|---|
| 주기적/빈번한 자동처리 | APScheduler → 시나리오 1 무인 큐레이션 |
| SaaS 연동 | Notion 운명 일지 자동 적재 |
| WorkFlow / A2A / Orchestration | 3개 A2A 에이전트 + 오케스트레이터 협상 루프 |
| Agent1→Agent2 가시화 | SSE 라이브 패널(`/api/stream`) |
