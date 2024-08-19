#!/bin/bash

# --no-deps: don't install package dependencies
# --no-color: suppress colored output
# --isolated: run pip in an isolated mode, ignoring environment variables and user configuration
# --no-warn-conflicts: do not warn about broken dependencies
# --disable-pip-version-check: don't periodically check PyPI to determine whether a new version of pip is available for download
CMD="flock -x $FLOCK -c '/usr/local/bin/python -m pip install $REQUIREMENT --no-deps --no-color --isolated --no-warn-conflicts --disable-pip-version-check --root-user-action=ignore -t $TARGET'"
echo $CMD
eval $CMD