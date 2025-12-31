#!/bin/bash
# Backup all persistent data
# Usage: ./scripts/backup-data.sh [backup-directory]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Volume names
PHOTOS_VOLUME="mcf-faces_photos_data"
FACES_VOLUME="mcf-faces_faces_data"
METADATA_VOLUME="mcf-faces_metadata"

BACKUP_DIR="${1:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}Starting backup process...${NC}"
echo "Backup directory: $BACKUP_DIR"
echo "Timestamp: $DATE"
echo ""

# Check if volumes exist
if ! docker volume inspect "$PHOTOS_VOLUME" >/dev/null 2>&1; then
  echo -e "${RED}Error: Volume '$PHOTOS_VOLUME' not found${NC}"
  echo "Is the application running?"
  exit 1
fi

# Backup photos
echo -e "${YELLOW}Backing up photos...${NC}"
docker run --rm \
  -v "$PHOTOS_VOLUME:/data" \
  -v "$(realpath "$BACKUP_DIR"):/backup" \
  alpine tar czf "/backup/photos_$DATE.tar.gz" -C /data .

PHOTOS_SIZE=$(du -h "$(realpath "$BACKUP_DIR")/photos_$DATE.tar.gz" | cut -f1)
echo -e "${GREEN}✓ Photos backed up ($PHOTOS_SIZE)${NC}"

# Backup faces
echo -e "${YELLOW}Backing up faces...${NC}"
docker run --rm \
  -v "$FACES_VOLUME:/data" \
  -v "$(realpath "$BACKUP_DIR"):/backup" \
  alpine tar czf "/backup/faces_$DATE.tar.gz" -C /data .

FACES_SIZE=$(du -h "$(realpath "$BACKUP_DIR")/faces_$DATE.tar.gz" | cut -f1)
echo -e "${GREEN}✓ Faces backed up ($FACES_SIZE)${NC}"

# Backup metadata
echo -e "${YELLOW}Backing up metadata...${NC}"
docker run --rm \
  -v "$METADATA_VOLUME:/data" \
  -v "$(realpath "$BACKUP_DIR"):/backup" \
  alpine tar czf "/backup/metadata_$DATE.tar.gz" -C /data .

METADATA_SIZE=$(du -h "$(realpath "$BACKUP_DIR")/metadata_$DATE.tar.gz" | cut -f1)
echo -e "${GREEN}✓ Metadata backed up ($METADATA_SIZE)${NC}"

echo ""
echo -e "${GREEN}Backup complete!${NC}"
echo "Files saved to: $BACKUP_DIR"
echo ""
ls -lh "$BACKUP_DIR" | grep "$DATE"

echo ""
echo "To restore from backup:"
echo "  1. Stop the application: docker compose down"
echo "  2. Remove old volumes: docker volume rm $PHOTOS_VOLUME $FACES_VOLUME $METADATA_VOLUME"
echo "  3. Recreate volumes: docker volume create $PHOTOS_VOLUME (and others)"
echo "  4. Restore data:"
echo "     docker run --rm -v $PHOTOS_VOLUME:/data -v $BACKUP_DIR:/backup alpine tar xzf /backup/photos_$DATE.tar.gz -C /data"
echo "  5. Restart: docker compose up -d"
