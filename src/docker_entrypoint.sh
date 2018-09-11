#!/usr/bin/env bash
CONTAINER_ALREADY_STARTED="/src/.firstrun_executed_flag"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    touch $CONTAINER_ALREADY_STARTED
    echo "-- First container startup --"
apt-get update && apt-get install -y nano curl  > /dev/null & #kill - only for build debugging

    cd /src
    git clone https://github.com/ianmaddox/gcs-cf-tokenizer
    cd gcs-cf-tokenizer
#    cp src/server.js /src/server.js
    npm install
npm install express #kill - should be in git
cp ../server.js . #kill - the latest should be in git
    ls -ltrha
    cd ..
else
    echo "-- Not first container startup --"
    git pull upstream master
fi

node gcs-cf-tokenizer/server.js

#This command keeps the container running
tail -f /dev/null
