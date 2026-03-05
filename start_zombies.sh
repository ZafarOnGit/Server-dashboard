#!/usr/bin/env bash
# Start the Black Ops 2 Zombies dedicated server
cd "$(dirname "$0")"
./t6sp +set dedicated 2 +set fs_game "mods/t6r" +exec dedicated_zm.cfg
