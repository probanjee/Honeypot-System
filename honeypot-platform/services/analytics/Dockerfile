FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY services/analytics/ /app/services/analytics/

ENV PYTHONPATH=/app

CMD ["python", "services/analytics/main.py"]
