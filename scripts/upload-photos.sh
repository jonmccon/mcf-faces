#!/bin/bash
# Upload photos and trigger processing
# Usage: ./scripts/upload-photos.sh /path/to/local/photos [remote-host]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}Error: Missing required argument${NC}"
  echo "Usage: $0 <local-photos-directory> [remote-host]"
  echo ""
  echo "Examples:"
  echo "  $0 /path/to/local/photos              # For local Docker"
  echo "  $0 /path/to/local/photos server.com   # For remote server"
  exit 1
fi

LOCAL_DIR="$1"
REMOTE_HOST="${2:-localhost}"
REMOTE_USER="${REMOTE_USER:-root}"

# Validate local directory exists
if [ ! -d "$LOCAL_DIR" ]; then
  echo -e "${RED}Error: Directory '$LOCAL_DIR' does not exist${NC}"
  exit 1
fi

# Count photos to upload (with safety limits for large directories)
PHOTO_COUNT=$(find "$LOCAL_DIR" -maxdepth 3 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.tiff" -o -iname "*.webp" \) 2>/dev/null | head -10000 | wc -l)
if [ "$PHOTO_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}Warning: No photos found in '$LOCAL_DIR'${NC}"
  exit 0
fi

echo -e "${GREEN}Found $PHOTO_COUNT photo(s) to upload${NC}"

# Get Docker volume path
if [ "$REMOTE_HOST" = "localhost" ]; then
  # Local deployment
  VOLUME_PATH=$(docker volume inspect mcf-faces_photos_data --format '{{ .Mountpoint }}' 2>/dev/null)
  
  if [ -z "$VOLUME_PATH" ]; then
    echo -e "${RED}Error: Docker volume 'mcf-faces_photos_data' not found.${NC}"
    echo "Is the application running? Try: docker-compose up -d"
    exit 1
  fi
  
  echo -e "${GREEN}Uploading photos from $LOCAL_DIR to $VOLUME_PATH...${NC}"
  
  # Use rsync for efficient transfer
  rsync -avz --progress "$LOCAL_DIR/" "$VOLUME_PATH/"
  
  echo -e "${GREEN}Photos uploaded successfully!${NC}"
  echo -e "${GREEN}Triggering processing...${NC}"
  
  # Trigger incremental processing
  docker-compose exec -T api python backend/process_photos.py --incremental
  
  echo -e "${GREEN}Processing complete!${NC}"
  echo "Check logs with: docker-compose logs -f api"
else
  # Remote deployment
  echo -e "${GREEN}Uploading photos to remote server $REMOTE_HOST...${NC}"
  
  # Detect deployment path on remote server
  DEPLOY_PATH=""
  if command -v jq &> /dev/null; then
    # Use jq for robust JSON parsing if available
    CONFIG_FILE=$(ssh "$REMOTE_USER@$REMOTE_HOST" "docker compose ls --format json 2>/dev/null" | jq -r '.[] | select(.Name == "mcf-faces") | .ConfigFiles' 2>/dev/null | head -1)
    if [ -n "$CONFIG_FILE" ] && [ "$CONFIG_FILE" != "null" ]; then
      DEPLOY_PATH=$(dirname "$CONFIG_FILE")
    fi
  else
    # Fallback to grep-based parsing
    CONFIG_FILE=$(ssh "$REMOTE_USER@$REMOTE_HOST" "docker compose ls 2>/dev/null | grep -w mcf-faces | awk '{print \$NF}'" 2>/dev/null)
    if [ -n "$CONFIG_FILE" ] && [ "$CONFIG_FILE" != "/" ]; then
      DEPLOY_PATH=$(dirname "$CONFIG_FILE" 2>/dev/null) || DEPLOY_PATH=""
    fi
  fi
  
  # Validate detected path
  if [ -z "$DEPLOY_PATH" ] || [ "$DEPLOY_PATH" = "." ] || [ "$DEPLOY_PATH" = "/" ]; then
    echo -e "${YELLOW}Warning: Could not auto-detect deployment path or path is invalid${NC}"
    DEPLOY_PATH="${REMOTE_DEPLOY_PATH:-/root/mcf-faces}"
    echo -e "${YELLOW}Using default: $DEPLOY_PATH${NC}"
    echo "Set REMOTE_DEPLOY_PATH environment variable to override"
  else
    echo "Detected deployment path: $DEPLOY_PATH"
  fi
  
  # First, get the volume path from remote server
  VOLUME_PATH=$(ssh "$REMOTE_USER@$REMOTE_HOST" "docker volume inspect mcf-faces_photos_data --format '{{ .Mountpoint }}' 2>/dev/null")
  
  if [ -z "$VOLUME_PATH" ]; then
    echo -e "${RED}Error: Docker volume 'mcf-faces_photos_data' not found on remote server.${NC}"
    echo "Is the application running on $REMOTE_HOST?"
    exit 1
  fi
  
  # Use rsync for efficient transfer over SSH
  rsync -avz --progress -e ssh "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$VOLUME_PATH/"
  
  echo -e "${GREEN}Photos uploaded successfully!${NC}"
  echo -e "${GREEN}Triggering processing on remote server...${NC}"
  
  # Trigger incremental processing on remote server
  ssh "$REMOTE_USER@$REMOTE_HOST" "cd $DEPLOY_PATH && docker compose exec -T api python backend/process_photos.py --incremental"
  
  echo -e "${GREEN}Processing complete!${NC}"
  echo "Check logs with: ssh $REMOTE_USER@$REMOTE_HOST 'cd $DEPLOY_PATH && docker compose logs -f api'"
fi
