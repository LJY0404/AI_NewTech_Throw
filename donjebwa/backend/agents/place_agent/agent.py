"""
장소 에이전트 (backend/agents/place_agent/agent.py)

실행: uvicorn agents.place_agent.agent:a2a_app --port 8001
카드:  http://localhost:8001/.well-known/agent-card.json

에이전트는 search_places 도구를 호출하고 그 결과를 '그대로' 반환만 한다.
실제 판단·데이터는 전부 tools.py(결정론적)에 있다.
"""
import os

from google.adk.agents import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from core.config import settings
from agents.place_agent.tools import search_places

if settings.GEMINI_API_KEY:
    os.environ.setdefault("GOOGLE_API_KEY", settings.GEMINI_API_KEY)
    os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "FALSE")

PLACE_INSTRUCTION = """\
당신은 '던져봐'의 장소 추출 에이전트입니다.

입력: JSON {"region": "...", "mood": "...", "when": "...", "avoid_crowded": true/false, "exclude_places": [...]}

해야 할 일:
1. search_places 도구를 입력의 region, avoid_crowded, exclude_places 값 그대로 한 번 호출한다.
2. 도구가 반환한 JSON을 '그대로' 출력한다. 후보 목록을 절대 수정·요약·생략하지 않는다.

출력: 도구 반환값(JSON) 하나만. 인사말·설명·마크다운·코드펜스(```) 금지.
"""

root_agent = Agent(
    name="place_agent",
    model=settings.GEMINI_MODEL,
    description="지역의 장소 후보를 추출하는 에이전트 (혼잡 회피 재추출 지원)",
    instruction=PLACE_INSTRUCTION,
    tools=[search_places],
)

a2a_app = to_a2a(root_agent, port=8001)
