# 던져봐 백엔드 — 디렉토리 구조 (✅ 완성 / ⬜ 예정)

backend/
├── app/                  ✅ FastAPI (라우터·SSE·스케줄러 배선)
├── orchestrator/         ✅ run() 흐름 + 추첨 + 협상 + A2A(JSON-RPC client)
├── core/                 ✅ config / db / models / logging
├── integrations/         🟡 notion ✅ | tour_api·kakao·seoul_city ⬜ (실데이터용, DEMO엔 불필요)
├── scheduler/            ✅ jobs (시나리오 1 자동 큐레이션)
├── agents/               ✅ 3종 모두 완성
│   ├── storyteller_agent/✅ Gemini, 동행별 톤 (port 8003)
│   ├── place_agent/      ✅ 캐시 기반 후보 추출 (port 8001)
│   └── route_agent/      ✅ 혼잡 반려 판정 (port 8002)
├── data/
│   ├── region_pool.json  ✅ 추첨 지역 20곳
│   └── place_cache/      🟡 성수·양평 ✅ (나머지 지역은 일반 후보 자동 생성)
├── test_agent.py         ✅ 스토리텔러 단독 테스트
├── pyproject.toml ✅  .env.example ✅
└── Dockerfile ⬜  README.md ⬜

## 실행 (터미널 4개)
    # .env에 GEMINI_API_KEY 채운 뒤, 각 터미널에서 (.venv) 활성화
    # T1 장소
    uvicorn agents.place_agent.agent:a2a_app --port 8001
    # T2 동선
    uvicorn agents.route_agent.agent:a2a_app --port 8002
    # T3 스토리텔러
    uvicorn agents.storyteller_agent.agent:a2a_app --port 8003
    # T4 메인 (이건 SCHEDULER_ENABLED=true로 두면 자동 시나리오1도 돔)
    uvicorn app.main:app --reload --port 8000

## 시나리오 2 테스트 (전부 뜬 상태에서)
    POST http://localhost:8000/api/throw
    {"region":"성수","when":"토요일 14시","companion":"커플","mood":"조용한 분위기"}
    → 동선이 반려 → 오케스트레이터가 장소 재요청 → 통과 → 스토리 → 노션/DB
    진행 과정은 http://localhost:8000/api/stream (SSE)에서 실시간 관찰

## 협상이 일어나는 이유 (데모 설계)
- 성수 캐시 = 인기 4 + 한산 4
- 첫 추출은 인기 위주 → 토요일 14시(피크)엔 동선이 "혼잡, 가용<3"으로 반려
- 재요청(avoid_crowded=true)은 한산한 4곳 → 통과
