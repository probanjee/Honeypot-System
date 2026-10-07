FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY services/threat_intel/ /app/services/threat_intel/

ENV PYTHONPATH=/app

CMD ["python", "services/threat_intel/main.py"]
