# 던져봐 백엔드 이미지
# 메인 앱과 3개 에이전트가 같은 이미지를 쓰고, compose에서 command/port만 바꿔 띄운다.
FROM python:3.12-slim

WORKDIR /app

# 소스 전체 복사 후 의존성 + 패키지 설치
COPY . .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e .

# 기본은 메인 앱(8000). compose에서 서비스별로 덮어쓴다.
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
