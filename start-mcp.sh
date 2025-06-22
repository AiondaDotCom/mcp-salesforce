#!/bin/bash

# Change to the project directory
cd /Users/saf/dev/mcp-salesforce

# Load environment variables from .env file
export $(cat .env | xargs)

# Start the MCP server
node src/index.js