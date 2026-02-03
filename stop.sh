#!/bin/bash

# Check for PID file
if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  echo "Stopping server (PID: $PID)..."
  
  # Check if process exists before killing
  if ps -p $PID > /dev/null; then
    kill $PID
    echo "Server stopped."
  else
    echo "Process $PID not found. Cleaning up PID file."
  fi
  rm .server.pid

else
  echo "No .server.pid file found."
  
  # Fallback: Check port 8080
  echo "Checking for any process on port 8080..."
  PID=$(lsof -t -i:8080)
  
  if [ -n "$PID" ]; then
    echo "Found process $PID running on port 8080. Killing it..."
    kill $PID
    echo "Server stopped."
  else
    echo "No server found running on port 8080."
  fi
fi
