#!/usr/bin/env bash
# github ianmaddox/gcs-cf-tokenizer
# Docker container bootstrapping script
# This file is not used with Cloud Functions.
# See ../README.md for license and more info

CONTAINER_ALREADY_STARTED="/tokenizer/.firstrun_executed_flag"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    echo "-- First container startup --"

    cd /tmp
    curl -L https://www.npmjs.com/install.sh | sh

    cd /tokenizer
    git reset --hard HEAD

    npm install
    ls -ltrha
    touch $CONTAINER_ALREADY_STARTED
else
    echo "-- Not first container startup --"
    git pull upstream master
fi

node /tokenizer/src/server.js

#This command keeps the container running
tail -f /dev/null
