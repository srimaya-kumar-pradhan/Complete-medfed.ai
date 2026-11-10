# ==============================================================================
# Complete-MedFed: Production Dockerfile for Hugging Face Spaces & Cloud Run
# ==============================================================================
FROM python:3.11-slim

# System build dependencies & libpq for PostgreSQL/Supabase
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requirement: create and switch to non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/home/user/app \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

# Install lightweight PyTorch CPU wheel first (~180MB vs 2.5GB CUDA wheel)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy project dependency manifest
COPY --chown=user:user healthcare-application/backend/pyproject.toml .

# Install application dependencies
RUN pip install --no-cache-dir .

# Copy application source code, models, and artifacts
COPY --chown=user:user healthcare-application/backend/app ./app
COPY --chown=user:user model-artifacts ./model-artifacts
COPY --chown=user:user federated-learning ./federated-learning

# Default production configuration for Hugging Face Spaces
ENV PORT=7860 \
    ENVIRONMENT=production \
    DEBUG=false \
    MEDFED_MODEL_PATH=model-artifacts/best_global_model.pth \
    MEDFED_DEVICE=cpu \
    STORAGE_BACKEND=local \
    STORAGE_PATH=./storage

# Create storage directory with appropriate permissions
RUN mkdir -p /home/user/app/storage

# Expose default Hugging Face Space port
EXPOSE 7860

# Start production ASGI server with dynamic port support
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
