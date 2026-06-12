"""
스토리텔러 에이전트 (backend/agents/storyteller_agent/agent.py)

ADK Agent를 to_a2a로 A2A 서버로 노출한다.
실행: uvicorn agents.storyteller_agent.agent:a2a_app --port 8003
카드:  http://localhost:8003/.well-known/agent-card.json
"""
import os

from google.adk.agents import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a

from core.config import settings
from agents.storyteller_agent.prompts import STORYTELLER_INSTRUCTION

# 이 에이전트는 main 앱과 별개 프로세스(uvicorn)로 뜬다.
# core.config가 .env를 읽어주므로, 거기서 키를 받아 google-genai가 쓰는
# 환경변수로 넣어준다. (AI Studio 키 사용 → Vertex 비활성화)
if settings.GEMINI_API_KEY:
    os.environ.setdefault("GOOGLE_API_KEY", settings.GEMINI_API_KEY)
    os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "FALSE")

root_agent = Agent(
    name="storyteller_agent",
    model=settings.GEMINI_MODEL,  # gemini-3.1-flash-lite
    description="여행 코스를 동행 유형(혼자/친구/커플)에 맞는 톤의 짧은 내러티브로 풀어내는 에이전트",
    instruction=STORYTELLER_INSTRUCTION,
)

# A2A 서버 앱. 포트(8003)는 .env의 STORYTELLER_AGENT_URL과 반드시 일치시킬 것.
a2a_app = to_a2a(root_agent, port=8003)
