FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY configs/honeypot-rules.yaml /app/configs/honeypot-rules.yaml
COPY services/ingestion/ /app/services/ingestion/

ENV PYTHONPATH=/app

CMD ["python", "services/ingestion/main.py"]
