"""
A2A 전송 래퍼 (backend/orchestrator/client.py)

a2a-sdk 고수준 Client는 버전마다 API가 바뀌어 잘 깨진다. 그래서 A2A의 본질인
JSON-RPC(message/send)를 httpx로 직접 호출한다. 와이어 포맷은 표준이라 SDK 버전과
무관하게 안정적이고, 로컬·도커 어디서든 동작한다.

엔드포인트 정책:
- to_a2a로 띄운 에이전트는 JSON-RPC 엔드포인트가 베이스 URL 루트(/)에 있다.
- 카드의 self-url(도커에선 localhost로 잘못 박힐 수 있음)을 신뢰하지 않고,
  settings/registry가 준 베이스 URL로 직접 POST한다.

규약: 오케스트레이터 ↔ 에이전트는 'JSON 문자열 한 덩어리'를 주고받는다.
"""
import json
import logging
from typing import Any
from uuid import uuid4

import httpx

logger = logging.getLogger("donjebwa.a2a")


async def call_agent(card_url: str, payload: dict[str, Any], timeout: float = 60.0) -> dict[str, Any]:
    """card_url의 A2A 에이전트에 payload를 보내고 응답(dict)을 받는다."""
    endpoint = card_url.rstrip("/") + "/"
    rpc_request = {
        "jsonrpc": "2.0",
        "id": uuid4().hex,
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "parts": [
                    {"kind": "text", "text": json.dumps(payload, ensure_ascii=False)}
                ],
                "messageId": uuid4().hex,
                "kind": "message",
            }
        },
    }

    async with httpx.AsyncClient(timeout=timeout) as http:
        resp = await http.post(endpoint, json=rpc_request)
        resp.raise_for_status()
        data = resp.json()

    if "error" in data:
        raise RuntimeError(f"A2A 에이전트 오류: {data['error']}")

    text = _extract_text(data.get("result", data))
    return _loads(text)


def _extract_text(node: Any) -> str:
    """
    응답 JSON(트리)에서 text part를 모두 긁어 마지막 것을 쓴다.
    result가 Message든 Task든 동작한다.
    (★ A2A 응답 구조 문제 생기면 여기부터 의심)
    """
    found: list[str] = []

    def walk(n: Any) -> None:
        if isinstance(n, dict):
            if isinstance(n.get("text"), str):
                found.append(n["text"])
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(node)
    if not found:
        raise ValueError(f"A2A 응답에서 텍스트를 못 찾음: {node}")
    return found[-1]


def _loads(text: str) -> dict[str, Any]:
    """에이전트가 ```json 펜스로 감싸 보내도 파싱되게 정리 후 json.loads."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip().rstrip("`").strip()
    return json.loads(cleaned)
