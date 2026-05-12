FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY services/alerting/ /app/services/alerting/

ENV PYTHONPATH=/app

CMD ["python", "services/alerting/main.py"]
