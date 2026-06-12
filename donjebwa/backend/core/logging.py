"""
로깅 설정 (backend/core/logging.py)

config.py가 import 시 한 번 호출한다. 데모 때 터미널에서 A2A 흐름
(추첨→장소→동선→반려→재요청)을 눈으로 따라갈 수 있게 포맷을 잡는다.
"""
import logging


def setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    # 시끄러운 외부 로거는 낮춘다
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
