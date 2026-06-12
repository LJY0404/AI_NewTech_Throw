"""
에이전트 레지스트리 (backend/orchestrator/registry.py)

각 A2A 에이전트 서버의 베이스 URL 매핑. 실제 Agent Card는 각 URL의
/.well-known/agent.json 에서 client.py가 자동으로 받아온다.

URL은 절대 하드코딩하지 않고 settings(=.env)에서 읽는다.
- 로컬:   http://localhost:8001 ...
- 도커:   http://agents:8001 ...
이 규약 덕에 코드 수정 없이 환경만 바꿔 띄울 수 있다.
"""
from core.config import settings

PLACE: str = settings.PLACE_AGENT_URL
ROUTE: str = settings.ROUTE_AGENT_URL
STORYTELLER: str = settings.STORYTELLER_AGENT_URL
