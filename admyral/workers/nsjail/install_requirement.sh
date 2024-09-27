#!/bin/bash

if [ -z "$FLOCK" ] || [ -z "$REQUIREMENT" ] || [ -z "$TARGET" ]; then
    echo "Error: FLOCK, REQUIREMENT, and TARGET must be set"
    exit 1
fi

# --no-deps: don't install package dependencies
# --no-color: suppress colored output
# --isolated: run pip in an isolated mode, ignoring environment variables and user configuration
# --no-warn-conflicts: do not warn about broken dependencies
# --disable-pip-version-check: don't periodically check PyPI to determine whether a new version of pip is available for download
if flock -x "$FLOCK" /usr/local/bin/python -m pip install "$REQUIREMENT" \
    --no-deps \
    --no-color \
    --isolated \
    --no-warn-conflicts \
    --disable-pip-version-check \
    --root-user-action=ignore \
    -t "$TARGET"
then
    echo "Pip install completed successfully"
else
    echo "Failed to acquire lock or pip install failed"
    exit 1
fi
