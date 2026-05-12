FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY configs/honeypot-rules.yaml /app/configs/honeypot-rules.yaml
COPY services/honeypots/base/ /app/services/honeypots/base/
COPY services/honeypots/http/src/ /app/services/honeypots/http/src/

ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["python", "services/honeypots/http/src/server.py"]
