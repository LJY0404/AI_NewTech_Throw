"""
스토리텔러 단독 테스트 (backend/test_agent.py)

스토리텔러 에이전트가 떠 있는 상태에서 실행:
    python test_agent.py

A2A 호출 → Gemini 생성 → JSON 추출까지 한 번에 검증한다.
{"story": "..."} 가 출력되면 성공.
"""
import asyncio

from core.config import settings
from orchestrator.client import call_agent


async def main():
    resp = await call_agent(
        settings.STORYTELLER_AGENT_URL,
        {
            "region": "성수",
            "companion": "커플",
            "stops": [
                {"name": "대림창고", "category": "카페"},
                {"name": "성수연방", "category": "복합문화공간"},
                {"name": "서울숲", "category": "공원", "note": "노을 무렵 산책"},
            ],
        },
    )
    print("응답:", resp)


if __name__ == "__main__":
    asyncio.run(main())
