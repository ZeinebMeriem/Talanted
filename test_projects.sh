#!/bin/bash
# Test if API endpoints work
echo "Testing projects list endpoint..."
curl -s http://localhost:8081/api/generations | jq . || echo "Backend not running or DB empty"

echo -e "\n\nTesting user stats endpoint..."
curl -s http://localhost:8081/api/user/stats | jq . || echo "Failed to get stats"
