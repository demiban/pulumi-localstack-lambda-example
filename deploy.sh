PWD=$(pwd)
CONFIG_FILE=config/deploy-config.json
APP_NAME="$( jq -r '.name' "$CONFIG_FILE" )"
REGION="$( jq -r '.region' "$CONFIG_FILE" )"
STAGE="$( jq -r '.stage' "$CONFIG_FILE" )"
HANDLER_DIR=handler
STEP=1

# build handler
cd ${HANDLER_DIR}
    for F in ./*.js
    do
        # zip the executable
        zip ${F%.*}.zip ${F}

        [ $? == 0 ] || fail $((STEP++)) "Failed: zip"
    done
cd ${PWD}

pulumi stack init ${APP_NAME}-${STAGE}

pulumi config set aws:region ${REGION}

pulumi up

