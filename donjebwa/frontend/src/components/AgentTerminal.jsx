import { useState, useEffect, useRef, useCallback } from 'react';
import './AgentTerminal.css';
import { STREAM_URL, THROW_URL } from '../api';

/* 단계(stage) 메타 — 백엔드 EventStage와 1:1 대응 */
const STAGES = {
  draw:        { label: '지역 추첨',     color: '#C9A877' },
  place:       { label: '장소 탐색',     color: '#FFB066' },
  route:       { label: '동선 검증',     color: '#4A90E2' },
  negotiation: { label: '반려 · 재협상', color: '#FF5A1F' },
  storyteller: { label: '스토리텔링',    color: '#9B6DFF' },
  notion:      { label: '노션 적재',     color: '#50E3C2' },
  done:        { label: '완료',          color: '#3DDC84' },
  error:       { label: '오류',          color: '#FF4D4D' },
};
const STAGE_KEYS = Object.keys(STAGES);

/* 행위자(actor) 메타 — 우측 에이전트 레일에 표시 */
const ACTORS = {
  orchestrator:      { name: '오케스트레이터', short: 'OR', color: '#F7F2EC' },
  place_agent:       { name: '장소 에이전트',  short: 'PL', color: '#FFB066' },
  route_agent:       { name: '동선 에이전트',  short: 'RT', color: '#4A90E2' },
  storyteller_agent: { name: '스토리텔러',     short: 'ST', color: '#9B6DFF' },
};
const RAIL_ACTORS = ['orchestrator', 'place_agent', 'route_agent', 'storyteller_agent'];

/* 협업 플로우 레일에서 각 에이전트의 가로 위치(%) — 토큰 이동 좌표 계산용 */
const NODE_X = RAIL_ACTORS.reduce((acc, id, i) => {
  acc[id] = (i / (RAIL_ACTORS.length - 1)) * 100;
  return acc;
}, {});

/* 교환(exchange) 종류별 한글 라벨 + 방향 화살표 */
const KIND_LABEL = {
  send:    { label: '후보 전달',          arrow: '→' },
  approve: { label: '검증 통과 · 인계',   arrow: '→' },
  reject:  { label: '반려 · 재협상 요청', arrow: '⟲' },
  system:  { label: '노션 기록',          arrow: '·' },
  done:    { label: '합의 완료',          arrow: '✓' },
};

/* 이벤트 한 건 → "누가 누구에게" 메시지를 보냈는지 추론.
   백엔드 흐름(draw→place→route→[협상]→storyteller→notion→done)을 그대로 대화로 본다. */
function getExchange(evt) {
  if (!evt) return null;
  switch (evt.stage) {
    case 'draw':
      return { from: 'orchestrator', to: 'place_agent', kind: 'send' };
    case 'place':
      return { from: 'place_agent', to: 'route_agent', kind: 'send' };
    case 'route':
      return evt.payload?.ok
        ? { from: 'route_agent', to: 'storyteller_agent', kind: 'approve' }
        : { from: 'route_agent', to: 'place_agent', kind: 'reject' };
    case 'negotiation':
      return { from: 'route_agent', to: 'place_agent', kind: 'reject' };
    case 'storyteller':
      return { from: 'storyteller_agent', to: 'orchestrator', kind: 'send' };
    case 'notion':
      return { from: 'orchestrator', to: null, kind: 'system' };
    case 'done':
      return { from: 'orchestrator', to: null, kind: 'done' };
    default:
      return null;
  }
}

function exchangeCaption(ex) {
  if (!ex) return '에이전트 연결 대기 중…';
  const from = ACTORS[ex.from]?.name ?? ex.from;
  const meta = KIND_LABEL[ex.kind] ?? { label: '', arrow: '→' };
  if (ex.kind === 'done') return '4개 에이전트가 운명에 합의했습니다';
  if (!ex.to) return `${from} · ${meta.label}`;
  const to = ACTORS[ex.to]?.name ?? ex.to;
  return `${from} ${meta.arrow} ${to} · ${meta.label}`;
}

function fmtTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return d.toLocaleTimeString('ko-KR', { hour12: false });
}

export default function AgentTerminal({ request, onReset }) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting | streaming | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const esRef = useRef(null);
  const logRef = useRef(null);
  const doneRef = useRef(false);
  const postedRef = useRef(false);

  const pushEvent = useCallback((evt) => {
    setEvents((prev) => [...prev, evt]);
  }, []);

  useEffect(() => {
    if (!request) return;

    // 세션 초기화
    doneRef.current = false;
    postedRef.current = false;
    setEvents([]);
    setResult(null);
    setError(null);
    setStatus('connecting');

    const es = new EventSource(STREAM_URL);
    esRef.current = es;

    const finish = () => {
      doneRef.current = true;
      setStatus('done');
      es.close();
    };

    const handle = (e) => {
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return; // ping 등 비-JSON 프레임 무시
      }
      pushEvent(data);
      if (data.stage === 'error') {
        doneRef.current = true;
        setError(data.message || '에이전트 처리 중 오류가 발생했습니다.');
        setStatus('error');
        es.close();
      } else if (data.stage === 'done') {
        finish();
      }
    };

    // 백엔드는 이벤트 이름표 없이 unnamed 프레임으로만 보낸다(stage는 data 안에 있음)
    // → onmessage 하나로 전부 수신. (구버전 named 이벤트 호환용으로 단계별도 함께 구독)
    es.onmessage = handle;
    STAGE_KEYS.forEach((stage) => es.addEventListener(stage, handle));

    const startThrow = () => {
      if (postedRef.current) return;
      postedRef.current = true;
      // 스트림 구독이 열린 뒤 파이프라인을 트리거 → 초기 이벤트 유실 방지
      fetch(THROW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`요청 실패 (HTTP ${r.status})`);
          return r.json();
        })
        .then((card) => setResult(card))
        .catch((err) => {
          if (doneRef.current) return;
          doneRef.current = true;
          setError(err.message || '서버에 연결할 수 없습니다.');
          setStatus('error');
          es.close();
        });
    };

    es.onopen = () => {
      if (doneRef.current) return;
      setStatus('streaming');
      startThrow();
    };

    es.onerror = () => {
      // 완료 후 정상 종료거나 EventSource 자동 재연결 중일 수 있다.
      // 아직 한 번도 연결되지 못했고 POST도 못 보냈다면 백엔드 미기동으로 간주.
      if (doneRef.current) return;
      if (!postedRef.current) {
        doneRef.current = true;
        setError('실시간 스트림에 연결할 수 없습니다. 백엔드(:8000)가 실행 중인지 확인하세요.');
        setStatus('error');
        es.close();
      }
    };

    return () => {
      es.close();
    };
  }, [request, pushEvent]);

  // 새 로그가 쌓일 때마다 맨 아래로 스크롤
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  const lastEvent = events.length ? events[events.length - 1] : null;
  const lastActor = lastEvent ? lastEvent.actor : null;
  const negotiationCount = events.filter((e) => e.stage === 'negotiation').length;

  // 현재 진행 중인 에이전트 간 교환(누가→누구에게) — 협업 플로우 시각화의 핵심
  const activeExchange = getExchange(lastEvent);

  const statusMeta = {
    connecting: { text: '에이전트 연결 중', cls: 'connecting' },
    streaming:  { text: '에이전트 협상 진행 중', cls: 'live' },
    done:       { text: '협상 완료', cls: 'done' },
    error:      { text: '연결 오류', cls: 'error' },
  }[status];

  return (
    <section id="agent-terminal" className="aterm">
      <div className="aterm__head">
        <div className="aterm__label">A2A NEGOTIATION TERMINAL</div>
        <h2 className="aterm__title">
          4개의 AI가 <span className="aterm__title-accent">운명</span>을 협상하는 중
        </h2>
        <p className="aterm__desc">
          {request?.region
            ? `'${request.region}' 일대를 두고 장소·동선 에이전트가 실시간으로 후보를 주고받습니다.`
            : '에이전트들이 실시간으로 후보를 주고받습니다.'}
        </p>
      </div>

      <div className="aterm__panel">
        {/* 터미널 헤더 바 */}
        <div className="aterm__bar">
          <div className="aterm__traffic" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="aterm__bar-title">donjebwa://agents/stream</div>
          <div className={`aterm__status aterm__status--${statusMeta.cls}`}>
            <span className="aterm__status-dot" />
            {statusMeta.text}
          </div>
        </div>

        {/* 에이전트 협업 플로우 — 메시지가 보낸이→받는이로 실제 이동한다 */}
        <div className="aterm__flow">
          <div className="aterm__flow-track">
            <div className="aterm__flow-line" aria-hidden="true" />

            {activeExchange && activeExchange.to && status === 'streaming' && (
              <span
                key={events.length}
                className={`aterm__flow-token aterm__flow-token--${activeExchange.kind}`}
                style={{
                  '--fx': `${NODE_X[activeExchange.from]}%`,
                  '--tx': `${NODE_X[activeExchange.to]}%`,
                }}
                aria-hidden="true"
              />
            )}

            {RAIL_ACTORS.map((id) => {
              const a = ACTORS[id];
              const live = status === 'streaming';
              const isFrom = live && activeExchange?.from === id;
              const isTo = live && activeExchange?.to === id;
              const allDone = status === 'done';
              return (
                <div
                  key={id}
                  className={`aterm__node ${isFrom ? 'aterm__node--from' : ''} ${isTo ? 'aterm__node--to' : ''} ${allDone ? 'aterm__node--done' : ''}`}
                  style={{ '--actor': a.color }}
                >
                  <span className="aterm__node-badge">{a.short}</span>
                  <span className="aterm__node-name">{a.name}</span>
                  {isFrom && <span className="aterm__node-tag">전송 중</span>}
                  {isTo && <span className="aterm__node-tag aterm__node-tag--in">수신</span>}
                </div>
              );
            })}
          </div>

          <div className={`aterm__flow-caption ${activeExchange?.kind === 'reject' ? 'aterm__flow-caption--neg' : ''}`}>
            {status === 'error'
              ? '협업 중단됨'
              : status === 'connecting'
              ? '에이전트 연결 대기 중…'
              : exchangeCaption(activeExchange)}
          </div>
        </div>

        <div className="aterm__body">
          {/* 실시간 로그 */}
          <div className="aterm__log" ref={logRef}>
            {events.length === 0 && status !== 'error' && (
              <div className="aterm__waiting">
                <span className="aterm__caret" />
                에이전트 부팅 중<span className="aterm__dots"><i>.</i><i>.</i><i>.</i></span>
              </div>
            )}

            {events.map((evt, i) => {
              const stage = STAGES[evt.stage] || { label: evt.stage, color: '#9b9089' };
              const actor = ACTORS[evt.actor] || { name: evt.actor, short: '··', color: '#9b9089' };
              const isNeg = evt.stage === 'negotiation';
              const ex = getExchange(evt);
              const meta = ex ? (KIND_LABEL[ex.kind] ?? { arrow: '→' }) : null;
              return (
                <div
                  key={i}
                  className={`aterm__row ${isNeg ? 'aterm__row--neg' : ''} ${evt.stage === 'done' ? 'aterm__row--done' : ''} ${evt.stage === 'error' ? 'aterm__row--err' : ''}`}
                  style={{ '--stage': stage.color }}
                >
                  <span className="aterm__time">{fmtTime(evt.ts)}</span>
                  <span className="aterm__actor" style={{ '--actor': actor.color }}>
                    {ex && ex.to ? (
                      <span className="aterm__handoff">
                        <b
                          className="aterm__handoff-end"
                          style={{ '--actor': ACTORS[ex.from]?.color }}
                        >
                          {ACTORS[ex.from]?.short ?? '··'}
                        </b>
                        <i className={`aterm__handoff-arrow ${ex.kind === 'reject' ? 'is-neg' : ''}`}>
                          {meta.arrow}
                        </i>
                        <b
                          className="aterm__handoff-end"
                          style={{ '--actor': ACTORS[ex.to]?.color }}
                        >
                          {ACTORS[ex.to]?.short ?? '··'}
                        </b>
                      </span>
                    ) : (
                      actor.name
                    )}
                  </span>
                  <span className="aterm__stage">{stage.label}</span>
                  <span className="aterm__msg">{evt.message}</span>
                  {evt.reasoning && (
                    <div className="aterm__reasoning">
                      <span className="aterm__reasoning-label">
                        <span className="aterm__reasoning-spark" aria-hidden="true">✦</span>
                        {actor.name} · 판단 근거
                      </span>
                      <p className="aterm__reasoning-text">{evt.reasoning}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {status === 'error' && (
              <div className="aterm__row aterm__row--err">
                <span className="aterm__time">{fmtTime()}</span>
                <span className="aterm__actor">system</span>
                <span className="aterm__stage">오류</span>
                <span className="aterm__msg">{error}</span>
              </div>
            )}
          </div>

          {/* 에이전트 상태 레일 */}
          <aside className="aterm__rail">
            <div className="aterm__rail-title">AGENTS</div>
            {RAIL_ACTORS.map((id) => {
              const a = ACTORS[id];
              const active = lastActor === id && status === 'streaming';
              return (
                <div
                  key={id}
                  className={`aterm__agent ${active ? 'aterm__agent--active' : ''}`}
                  style={{ '--actor': a.color }}
                >
                  <span className="aterm__agent-badge">{a.short}</span>
                  <span className="aterm__agent-name">{a.name}</span>
                  {active && <span className="aterm__agent-pulse" />}
                </div>
              );
            })}

            <div className="aterm__rail-meta">
              <div className="aterm__metric">
                <span className="aterm__metric-num">{events.length}</span>
                <span className="aterm__metric-label">EVENTS</span>
              </div>
              <div className="aterm__metric">
                <span className="aterm__metric-num aterm__metric-num--neg">{negotiationCount}</span>
                <span className="aterm__metric-label">반려/재협상</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 최종 코스 결과 카드 */}
      {result && (
        <div className="aterm__result">
          <div className="aterm__result-head">
            <span className="aterm__result-badge">DESTINY CONFIRMED</span>
            <h3 className="aterm__result-title">{result.region} 운명 코스</h3>
            <span className="aterm__result-sub">{result.companion}와 함께하는 여정</span>
          </div>

          {Array.isArray(result.stops) && result.stops.length > 0 && (
            <ol className="aterm__stops">
              {result.stops.map((s, i) => (
                <li key={i} className="aterm__stop">
                  <span className="aterm__stop-idx">{i + 1}</span>
                  <div className="aterm__stop-body">
                    <div className="aterm__stop-name">
                      {s.name}
                      {s.category && <span className="aterm__stop-cat">{s.category}</span>}
                    </div>
                    {s.address && <div className="aterm__stop-addr">{s.address}</div>}
                    {s.note && <div className="aterm__stop-note">{s.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {result.story && <p className="aterm__story">{result.story}</p>}

          <div className="aterm__result-actions">
            {result.notion_url && (
              <a
                className="aterm__notion"
                href={result.notion_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                노션 여행 일지 열기 ↗
              </a>
            )}
            <button type="button" className="aterm__again" onClick={onReset}>
              다시 던지기
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="aterm__result-actions aterm__result-actions--center">
          <button type="button" className="aterm__again" onClick={onReset}>
            다시 시도하기
          </button>
        </div>
      )}
    </section>
  );
}
