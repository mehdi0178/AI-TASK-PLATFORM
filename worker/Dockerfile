# ---------- Builder Stage ----------
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Runtime Stage ----------
FROM python:3.12-slim

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

COPY --from=builder /install /usr/local
COPY . .

RUN chown -R appuser:appgroup /app

ENV PYTHONUNBUFFERED=1

USER appuser

CMD ["python", "main.py"]