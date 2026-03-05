#!/usr/bin/env bash
# Start the Minecraft server
cd "$(dirname "$0")"
java -Xmx2G -Xms512M -jar server.jar nogui
