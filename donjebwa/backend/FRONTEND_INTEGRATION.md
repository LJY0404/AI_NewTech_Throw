# 프론트 연동 가이드 (프론트 담당자용)

백엔드는 다 만들어져 있다. 이 문서대로 **3개만** 하면 룰렛 → 실제 코스 + 에이전트
실시간 진행이 화면에 뜬다.

준비물: `api.js`, `AgentLivePanel.jsx` (이 폴더에 같이 들어있음)

---

## 0. 전제 — 백엔드가 돌고 있어야 함

`FRIEND_SETUP.md` 대로 백엔드 4개 서버(8000~8003)를 띄워둔다.
그리고 백엔드 `.env` 에 프론트 주소를 CORS로 열어둬야 한다(안 그러면 브라우저가 막음):
```
CORS_ORIGINS=["http://localhost:5173"]
```
(Vite 기본 포트가 5173. 다르면 네 포트로.)

---

## 1. 파일 2개 넣기

`api.js`, `AgentLivePanel.jsx` 를 `src/` 에 복사한다.
백엔드 주소가 localhost:8000이 아니면 프론트 `.env` 에:
```
VITE_API_BASE=http://localhost:8000
```

---

## 2. 룰렛이 멈추면 백엔드 호출

지금 룰렛은 `Math.random()` 으로 도시를 정하고 끝난다. 거기서 **멈춘 지역을 백엔드로
넘겨** 실제 코스를 받아오게 바꾼다. 룰렛이 멈추는 함수(예: spin 종료 콜백)에 이렇게:

```jsx
import { throwCourse } from "./api";

// 룰렛이 region(예: "성수")에 멈췄을 때 호출
async function onRouletteStop(region) {
  try {
    const card = await throwCourse({
      region,                    // 룰렛이 멈춘 지역
      when: "토요일 14시",        // 사용자 입력값(없으면 이렇게 기본값)
      companion: "커플",          // "혼자" | "친구" | "커플"
      mood: "조용한 분위기",       // 사용자 입력값(선택)
    });
    // card.stops  → 코스 장소 배열 [{name, category, address, lat, lng, note}]
    // card.story  → 스토리텔러가 쓴 내러티브 문자열
    // card.notion_url → 노션 페이지 링크
    setCourse(card);             // 네 상태에 저장해서 화면에 렌더
  } catch (e) {
    console.error(e);
  }
}
```

> 팁: `when`을 "토요일 14시", `mood`를 "조용한 분위기"로 보내면 **협상(반려→재요청)**이
> 일어나는 게 패널에 보인다. 발표 때 이걸로 시연하면 임팩트 있다.
> 평범한 시간대(when 비우기)면 협상 없이 매끄럽게 통과한다.

받아온 `card.stops` 로 기존 지도/카드 UI를 채우고, `card.story` 를 코스 설명으로 띄우면 된다.

---

## 3. 라이브 패널 띄우기

`AgentLivePanel` 을 화면 어딘가(룰렛 옆/아래)에 그냥 놓으면 끝.
자기가 알아서 `/api/stream` 을 구독해서, 던질 때마다 에이전트 진행을 실시간으로 그린다.

```jsx
import AgentLivePanel from "./AgentLivePanel";

function App() {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div>{/* 기존 룰렛/지도 UI */}</div>
      <div style={{ width: 360 }}>
        <AgentLivePanel />
      </div>
    </div>
  );
}
```

이러면 던지기 시작 → 패널에 이런 흐름이 실시간으로 쌓인다:
```
오케스트레이터  사용자 입력 지역: 성수 (커플)
장소 에이전트    성수 후보 5곳 추출 + (선정 근거)
동선 에이전트    코스 부적합 반려 — 토요일 14시 혼잡 + (긴 판단 근거)
오케스트레이터  동선 부적합 → 장소 재요청 + (협상 근거)
장소 에이전트    보강 후보 4곳 재추출 + (근거)
동선 에이전트    검증 통과 — 4곳 확정
스토리텔러       커플 톤 내러티브 생성 완료
완료            성수 4곳 코스 완성
```
각 줄에 message(헤드라인)와 reasoning(판단 근거 2~4문장)이 함께 표시된다.
→ 평가자가 "하드코딩 아니라 진짜 에이전트가 판단·협상하는구나"를 눈으로 본다.

---

## (선택) 완전 자동 시연 버튼

룰렛 없이 "버튼 하나로 백엔드가 알아서 추첨→코스 생성"을 보여주고 싶으면:

```jsx
import { curate } from "./api";

<button onClick={async () => setCourse(await curate())}>자동 큐레이션 1회 실행</button>
```
이건 시나리오 1(완전 자동) 시연용. 패널에도 똑같이 진행 과정이 흐른다.

---

## API 명세 요약

| 엔드포인트 | 용도 | 요청 | 응답 |
|---|---|---|---|
| `POST /api/throw` | 사용자 지역으로 코스(협상 가능) | `{region, when, companion, mood}` | `CourseCard` |
| `POST /api/curate` | 자동 큐레이션 1회 | (없음) | `CourseCard` |
| `GET /api/stream` | 에이전트 진행 SSE | (없음) | `AgentEvent` 스트림 |
| `GET /api/history` | 과거 결과 목록 | (없음) | 배열 |

**CourseCard**: `{ mode, region, companion, stops:[{name,category,address,lat,lng,note}], story, notion_url, created_at }`
**AgentEvent**: `{ stage, actor, message, reasoning, ts }`
- `stage`: draw / place / route / negotiation / storyteller / notion / done
- `actor`: orchestrator / place_agent / route_agent / storyteller_agent
- `message`: 한 줄 헤드라인, `reasoning`: 판단 근거(2~4문장)

막히면 브라우저 콘솔(F12) 에러랑 백엔드 터미널 로그를 주영한테 보낼 것.
