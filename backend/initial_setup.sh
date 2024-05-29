#!/bin/bash

# install dependencies
poetry install

# apply database migrations
poetry run alembic upgrade head

# import workflow library
poetry run python scripts/populate_db_with_workflow_templates_library.py
