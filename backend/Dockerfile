FROM python:3.11-slim

# Build args
ARG ENVIRONMENT=production

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (needed for scraping if used)
RUN playwright install chromium --with-deps 2>/dev/null || true

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -r sniper && useradd -r -g sniper sniper && \
    chown -R sniper:sniper /app

USER sniper

# Environment variables with defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    ENVIRONMENT=production \
    PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose API port
EXPOSE ${PORT}

# Default command: run API server
# Override CMD in docker-compose for worker: celery -A app.workers.celery_app worker
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop"]
