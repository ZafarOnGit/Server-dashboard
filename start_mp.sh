#!/usr/bin/env bash
# Start the Black Ops 2 Multiplayer dedicated server
cd "$(dirname "$0")"
./t6mp +set dedicated 2 +set fs_game "mods/t6r" +exec dedicated.cfg
