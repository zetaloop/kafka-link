FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /uvx /bin/

WORKDIR /app

ARG PACKAGE_NAME

COPY pyproject.toml uv.lock /app/
COPY packages /app/packages
COPY services /app/services

RUN uv sync --locked --no-dev --package ${PACKAGE_NAME}

ENV PATH="/app/.venv/bin:${PATH}"
