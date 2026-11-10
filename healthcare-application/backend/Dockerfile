# ==============================================================================
# Complete-MedFed: Backend Dockerfile
# ==============================================================================
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/home/user/app \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY --chown=user:user pyproject.toml .
RUN pip install --no-cache-dir .

COPY --chown=user:user app ./app
COPY --chown=user:user ../../model-artifacts ./model-artifacts

ENV PORT=7860 \
    ENVIRONMENT=production \
    DEBUG=false \
    MEDFED_MODEL_PATH=model-artifacts/best_global_model.pth \
    MEDFED_DEVICE=cpu

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
