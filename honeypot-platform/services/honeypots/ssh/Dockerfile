FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY configs/honeypot-rules.yaml /app/configs/honeypot-rules.yaml
COPY services/honeypots/base/ /app/services/honeypots/base/
COPY services/honeypots/ssh/src/ /app/services/honeypots/ssh/src/

ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=2222

CMD ["python", "services/honeypots/ssh/src/server.py"]
