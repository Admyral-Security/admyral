# 1. Stage: Generate requirements.txt from poetry
FROM python:3.11-slim-buster AS requirements-stage
WORKDIR /tmp
RUN pip install poetry
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN poetry config virtualenvs.create false && \
    poetry export -f requirements.txt --output requirements.txt --without-hashes

# 2. Stage: Install dependencies and start service
FROM python:3.11-slim-buster

# set working directory
WORKDIR /usr/src/app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install system dependencies
RUN apt-get update \
  && apt-get -y install netcat gcc postgresql \
  && apt-get clean

# install python dependencies
RUN pip install --upgrade pip
COPY --from=requirements-stage /tmp/requirements.txt .
RUN pip install -r requirements.txt

# add app
COPY . .

CMD ["uvicorn", "app.main:app", "--proxy-headers", "--host", "0.0.0.0", "--port", "8000"]
