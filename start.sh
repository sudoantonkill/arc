#!/bin/bash

# Check if already running
if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  if ps -p $PID > /dev/null; then
    echo "Server is already running (PID: $PID)"
    exit 1
  else
    echo "Found stale .server.pid. Removing..."
    rm .server.pid
  fi
fi

echo "Starting Interview Ace server..."
# Run in background, log to server.log
nohup npm run dev > server.log 2>&1 &
PID=$!
echo $PID > .server.pid

echo "Server started! (PID: $PID)"
echo "Logs are being written to server.log"
echo "Access the app at http://localhost:8080"
