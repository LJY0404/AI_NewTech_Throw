"""
동선 검증 에이전트 (backend/agents/route_agent/agent.py)

실행: uvicorn agents.route_agent.agent:a2a_app --port 8002
카드:  http://localhost:8002/.well-known/agent-card.json

verify_route 도구를 호출하고 결과를 그대로 반환한다. 반려/통과 판정은
전부 tools.py(결정론적)에 있다. candidates는 한 글자도 바꾸지 않고 도구에 넘긴다.
"""
import os

from google.adk.agents import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from core.config import settings
from agents.route_agent.tools import verify_route

if settings.GEMINI_API_KEY:
    os.environ.setdefault("GOOGLE_API_KEY", settings.GEMINI_API_KEY)
    os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "FALSE")

ROUTE_INSTRUCTION = """\
당신은 '던져봐'의 동선 검증 에이전트입니다.

입력: JSON {"candidates": [ ... ], "when": "..."}

해야 할 일:
1. verify_route 도구를 호출한다. 이때 candidates 배열을 '한 항목도, 한 필드도 빠뜨리지 말고'
   입력 그대로 전달한다. when도 그대로 전달한다.
2. 도구가 반환한 JSON을 '그대로' 출력한다. ok/stops/reason/rejected를 절대 바꾸지 않는다.

출력: 도구 반환값(JSON) 하나만. 인사말·설명·마크다운·코드펜스(```) 금지.
"""

root_agent = Agent(
    name="route_agent",
    model=settings.GEMINI_MODEL,
    description="후보 장소의 혼잡·적합성을 검증해 코스를 확정하거나 반려하는 에이전트",
    instruction=ROUTE_INSTRUCTION,
    tools=[verify_route],
)

a2a_app = to_a2a(root_agent, port=8002)
