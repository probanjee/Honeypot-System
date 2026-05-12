FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY services/threat-intel/ /app/services/threat-intel/

ENV PYTHONPATH=/app

CMD ["python", "services/threat-intel/main.py"]
