# Docker Deployment Guide

This guide provides comprehensive instructions for deploying the Family Photos Face Recognition system using Docker, both for local development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Adding New Photos (File Transfer Method)](#adding-new-photos-file-transfer-method)
- [Data Management](#data-management)
- [Updating the Application](#updating-the-application)
- [Troubleshooting](#troubleshooting)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

#### Installing Docker

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
```

**macOS:**
Download and install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)

**Windows:**
Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

### System Requirements

- **Minimum RAM**: 4GB (8GB recommended for better performance)
- **Disk Space**: 50GB+ for photos and processed data
  - Initial Docker images: ~2GB
  - Per 1,000 photos: ~5-10GB (varies with resolution)
  - Processed faces: ~50MB per 1,000 faces
- **CPU**: Multi-core processor recommended for faster face detection

### Port Requirements

The following ports need to be available:

- **3000**: Web UI
- **8000**: API server
- **80**: HTTP (if using nginx reverse proxy)
- **443**: HTTPS (if using nginx reverse proxy with SSL)

Check if ports are available:
```bash
# Linux/macOS
sudo netstat -tlnp | grep -E ':(3000|8000|80|443)'

# Or using ss
ss -tlnp | grep -E ':(3000|8000|80|443)'
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mcf-faces.git
cd mcf-faces
```

### 2. Build and Start Services

```bash
# Build images and start all services
docker-compose up -d

# View logs to ensure everything started correctly
docker-compose logs -f
```

The `-d` flag runs containers in detached mode (background).

### 3. Access the Application

- **Web UI**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/stats

### 4. Initial Setup

When you first start the application, the data directories will be empty. To add photos:

1. Copy photos to the Docker volume (see [Adding New Photos](#adding-new-photos-file-transfer-method))
2. Trigger processing to detect faces
3. Use the web UI to label faces and manage the family tree

### 5. Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Production Deployment

### Recommended VPS Providers

For production deployment, we recommend the following VPS providers based on cost-effectiveness and reliability:

#### Budget-Friendly Options

**Hetzner Cloud** (Recommended)
- **CPX21**: 3 vCPU, 4GB RAM, 80GB SSD - ~€7.49/month
- **CPX31**: 4 vCPU, 8GB RAM, 160GB SSD - ~€13.90/month
- **Pros**: Best price/performance, excellent network, EU-based
- **Cons**: Limited to EU data centers
- **Website**: https://www.hetzner.com/cloud

**DigitalOcean**
- **Basic Droplet**: 2 vCPU, 4GB RAM, 80GB SSD - $24/month
- **CPU-Optimized**: 4 vCPU, 8GB RAM, 100GB SSD - $63/month
- **Pros**: Great documentation, worldwide data centers, managed databases
- **Cons**: More expensive than Hetzner
- **Website**: https://www.digitalocean.com/

**Linode (Akamai)**
- **Shared CPU**: 2 vCPU, 4GB RAM, 80GB SSD - $18/month
- **Dedicated CPU**: 4 vCPU, 8GB RAM, 160GB SSD - $36/month
- **Pros**: Good performance, competitive pricing, excellent support
- **Cons**: Interface not as modern
- **Website**: https://www.linode.com/

### Production Deployment Steps

#### 1. Provision a VPS

1. Choose a provider and create an account
2. Create a new instance with Ubuntu 22.04 LTS
3. Choose appropriate size (minimum 4GB RAM)
4. Set up SSH keys for secure access
5. Configure firewall to allow ports 22, 80, 443

#### 2. Initial Server Setup

```bash
# Connect to your server
ssh root@your-server-ip

# Update system packages
apt-get update && apt-get upgrade -y

# Install Docker and Docker Compose (see Prerequisites section)

# Create a non-root user (recommended)
adduser deployer
usermod -aG docker deployer
usermod -aG sudo deployer

# Switch to non-root user
su - deployer
```

#### 3. Deploy the Application

```bash
# Clone the repository
git clone https://github.com/yourusername/mcf-faces.git
cd mcf-faces

# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 4. Configure Firewall

```bash
# Using UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify rules
sudo ufw status
```

### Security Considerations

#### 1. Firewall Configuration

- Only expose necessary ports (80, 443, 22)
- Close direct access to ports 3000 and 8000
- Use the nginx reverse proxy for public access

#### 2. SSH Hardening

```bash
# Disable password authentication (use SSH keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin no

sudo systemctl restart sshd
```

#### 3. Environment Variables

Create a `.env` file for sensitive configuration:

```bash
# .env (do not commit to version control)
API_SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://yourdomain.com
```

Update `docker-compose.yml` to use the `.env` file:

```yaml
api:
  env_file:
    - .env
  environment:
    - PORT=8000
    - PYTHONUNBUFFERED=1
```

### Nginx SSL/TLS Setup with Let's Encrypt

#### 1. Enable Nginx Reverse Proxy

Uncomment the nginx service in `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  container_name: mcf-faces-nginx
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx-prod.conf:/etc/nginx/conf.d/default.conf:ro
    - ./certs:/etc/nginx/certs:ro
  depends_on:
    - api
    - web
  networks:
    - mcf-network
```

#### 2. Obtain SSL Certificates with Certbot

```bash
# Install Certbot
sudo apt-get install -y certbot

# Create certs directory
mkdir -p ~/mcf-faces/certs

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to certs directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/mcf-faces/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/mcf-faces/certs/
sudo chown $USER:$USER ~/mcf-faces/certs/*
```

#### 3. Update nginx-prod.conf

Uncomment the HTTPS server block in `nginx-prod.conf` and update the server_name:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    
    # ... rest of configuration
}
```

#### 4. Set Up Auto-Renewal

```bash
# Add renewal cron job
sudo crontab -e

# Add this line to renew certificates daily at 2am
0 2 * * * certbot renew --quiet --deploy-hook "docker-compose -f /home/deployer/mcf-faces/docker-compose.yml restart nginx"
```

## Adding New Photos (File Transfer Method)

### Overview

There are multiple ways to add photos to your deployed application:

1. **Direct Volume Access** (local deployment)
2. **SCP/RSYNC Transfer** (remote deployment)
3. **Helper Script** (recommended)

### Method 1: Using the Helper Script (Recommended)

The easiest way to upload photos is using the provided helper script:

```bash
# For local deployment
./scripts/upload-photos.sh /path/to/your/photos

# For remote deployment
./scripts/upload-photos.sh /path/to/your/photos your-server.com
```

The script will:
1. Find the Docker volume location
2. Transfer photos using rsync
3. Automatically trigger incremental processing
4. Show processing status

### Method 2: Manual Transfer (Local Deployment)

#### Step 1: Find the Volume Location

```bash
# Inspect the photos volume
docker volume inspect mcf-faces_photos_data

# The output will show the Mountpoint, e.g.:
# "Mountpoint": "/var/lib/docker/volumes/mcf-faces_photos_data/_data"
```

#### Step 2: Copy Photos

```bash
# Get the volume path
VOLUME_PATH=$(docker volume inspect mcf-faces_photos_data --format '{{ .Mountpoint }}')

# Copy photos (requires sudo for Docker volumes)
sudo cp /path/to/your/photos/* "$VOLUME_PATH/"

# Or use rsync for incremental transfers
sudo rsync -av /path/to/your/photos/ "$VOLUME_PATH/"
```

#### Step 3: Trigger Processing

```bash
# Run incremental processing
docker-compose exec api python backend/process_photos.py --incremental

# Monitor processing logs
docker-compose logs -f api
```

### Method 3: Manual Transfer (Remote Deployment)

#### Step 1: Get Remote Volume Path

```bash
# SSH to your server
ssh user@your-server.com

# Find the volume path
docker volume inspect mcf-faces_photos_data --format '{{ .Mountpoint }}'
```

#### Step 2: Transfer Photos with SCP

```bash
# From your local machine
# Replace with actual volume path from step 1
scp -r /path/to/your/photos/* user@your-server.com:/var/lib/docker/volumes/mcf-faces_photos_data/_data/
```

#### Step 3: Transfer Photos with Rsync (Recommended)

```bash
# Rsync is better for incremental transfers
rsync -avz --progress /path/to/your/photos/ user@your-server.com:/var/lib/docker/volumes/mcf-faces_photos_data/_data/
```

#### Step 4: Trigger Processing on Remote Server

```bash
# SSH to your server
ssh user@your-server.com

# Navigate to application directory
cd ~/mcf-faces

# Run incremental processing
docker-compose exec api python backend/process_photos.py --incremental

# Monitor logs
docker-compose logs -f api
```

### Processing Options

The `process_photos.py` script supports several options:

```bash
# Incremental processing (only new photos)
docker-compose exec api python backend/process_photos.py --incremental

# Full reprocessing (recompute embeddings)
docker-compose exec api python backend/process_photos.py --recompute-embeddings

# Recluster all faces
docker-compose exec api python backend/process_photos.py --recluster

# Show statistics
docker-compose exec api python backend/process_photos.py --stats

# Adjust clustering parameters
docker-compose exec api python backend/process_photos.py --eps 0.4 --min-samples 3
```

### Batch Upload Workflow

For regular uploads, we recommend this workflow:

1. **Organize photos locally** by date or event
2. **Upload in batches** using rsync for efficiency
3. **Run incremental processing** after each upload
4. **Label new faces** in the web UI
5. **Backup data** regularly (see Data Management section)

## Data Management

### Volume Locations and Structure

Docker volumes store persistent data:

```
mcf-faces_photos_data     → /app/backend/data/photos  (source photos)
mcf-faces_faces_data      → /app/backend/data/faces   (cropped face thumbnails)
mcf-faces_metadata        → /app/backend/data         (JSON metadata files)
```

### Inspecting Volumes

```bash
# List all volumes
docker volume ls | grep mcf-faces

# Inspect a specific volume
docker volume inspect mcf-faces_photos_data

# Check volume size
docker system df -v | grep mcf-faces
```

### Backup Strategy

#### Using the Backup Script (Recommended)

```bash
# Backup all data to ./backups directory
./scripts/backup-data.sh

# Backup to a specific directory
./scripts/backup-data.sh /path/to/backups
```

#### Manual Backup Commands

**Backup Photos:**
```bash
docker run --rm \
  -v mcf-faces_photos_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/photos-$(date +%Y%m%d).tar.gz -C /data .
```

**Backup Faces:**
```bash
docker run --rm \
  -v mcf-faces_faces_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/faces-$(date +%Y%m%d).tar.gz -C /data .
```

**Backup Metadata:**
```bash
docker run --rm \
  -v mcf-faces_metadata:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/metadata-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore from Backup

#### 1. Stop the Application

```bash
docker-compose down
```

#### 2. Remove Old Volumes (Optional)

```bash
# Only do this if you want to completely replace data
docker volume rm mcf-faces_photos_data
docker volume rm mcf-faces_faces_data
docker volume rm mcf-faces_metadata
```

#### 3. Restore Data

```bash
# Recreate volumes if removed
docker volume create mcf-faces_photos_data
docker volume create mcf-faces_faces_data
docker volume create mcf-faces_metadata

# Restore photos
docker run --rm \
  -v mcf-faces_photos_data:/data \
  -v ~/backups:/backup \
  alpine tar xzf /backup/photos-20231231.tar.gz -C /data

# Restore faces
docker run --rm \
  -v mcf-faces_faces_data:/data \
  -v ~/backups:/backup \
  alpine tar xzf /backup/faces-20231231.tar.gz -C /data

# Restore metadata
docker run --rm \
  -v mcf-faces_metadata:/data \
  -v ~/backups:/backup \
  alpine tar xzf /backup/metadata-20231231.tar.gz -C /data
```

#### 4. Restart the Application

```bash
docker-compose up -d
```

### Storage Space Monitoring

```bash
# Check overall Docker disk usage
docker system df

# Check specific volume sizes
docker system df -v | grep mcf-faces

# Check available disk space on host
df -h

# Monitor volume growth over time
du -sh /var/lib/docker/volumes/mcf-faces_*
```

### Cleaning Up Old Processed Data

```bash
# Remove orphaned face thumbnails
docker-compose exec api python backend/process_photos.py --cleanup

# Remove old Docker images and containers
docker system prune -a

# Remove unused volumes (be careful!)
docker volume prune
```

### Automated Backup Script

Create a cron job for automatic daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 3 AM
0 3 * * * /home/deployer/mcf-faces/scripts/backup-data.sh /home/deployer/backups >> /home/deployer/backup.log 2>&1
```

## Updating the Application

### Standard Update Process

#### 1. Pull Latest Changes

```bash
cd ~/mcf-faces
git pull origin main
```

#### 2. Rebuild Containers

```bash
# Rebuild images with latest code
docker-compose build

# Or rebuild specific service
docker-compose build api
docker-compose build web
```

#### 3. Restart with Zero Data Loss

```bash
# Stop containers (volumes remain intact)
docker-compose down

# Start with new images
docker-compose up -d
```

Data in volumes persists through container restarts.

### Update with Schema Changes

If metadata schema changes:

```bash
# Backup data first
./scripts/backup-data.sh

# Pull and rebuild
git pull origin main
docker-compose build

# Stop and restart
docker-compose down
docker-compose up -d

# Run migration if needed
docker-compose exec api python backend/migrate_metadata.py
```

### Rollback Procedure

If an update causes issues:

#### 1. Identify Previous Version

```bash
# View git history
git log --oneline -n 10
```

#### 2. Rollback Code

```bash
# Rollback to specific commit
git checkout <commit-hash>

# Or rollback one version
git checkout HEAD~1
```

#### 3. Rebuild and Restart

```bash
docker-compose build
docker-compose down
docker-compose up -d
```

#### 4. Restore Data if Needed

```bash
# If data was corrupted, restore from backup
# Follow the restore instructions shown at the end of backup-data.sh output
# Or manually restore:

# Stop the application
docker compose down

# Remove old volumes
docker volume rm mcf-faces_photos_data mcf-faces_faces_data mcf-faces_metadata

# Recreate volumes
docker volume create mcf-faces_photos_data
docker volume create mcf-faces_faces_data
docker volume create mcf-faces_metadata

# Restore data (replace DATE with your backup timestamp)
docker run --rm -v mcf-faces_photos_data:/data -v ~/backups:/backup alpine tar xzf /backup/photos_DATE.tar.gz -C /data
docker run --rm -v mcf-faces_faces_data:/data -v ~/backups:/backup alpine tar xzf /backup/faces_DATE.tar.gz -C /data
docker run --rm -v mcf-faces_metadata:/data -v ~/backups:/backup alpine tar xzf /backup/metadata_DATE.tar.gz -C /data

# Restart application
docker compose up -d
```

### Zero-Downtime Updates (Advanced)

For production with minimal downtime:

```bash
# Build new images
docker-compose build

# Use rolling restart
docker-compose up -d --no-deps --build api
docker-compose up -d --no-deps --build web
```

## Troubleshooting

### Common Issues and Solutions

#### Container Won't Start

**Symptoms**: Container exits immediately or won't start

**Diagnosis**:
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs api
docker-compose logs web

# Check last exit reason
docker inspect mcf-faces-api --format='{{.State.ExitCode}}'
```

**Solutions**:
- Check logs for specific error messages
- Verify all required files are present (Dockerfile, requirements, etc.)
- Ensure ports are not already in use
- Check file permissions

#### Out of Memory Errors

**Symptoms**: Container crashes with "Killed" or OOM errors

**Diagnosis**:
```bash
# Check memory usage
docker stats

# Check container logs
docker-compose logs api | grep -i "memory\|killed\|oom"
```

**Solutions**:
1. Increase host memory or upgrade VPS
2. Process photos in smaller batches
3. Adjust Docker memory limits in docker-compose.yml:

```yaml
api:
  deploy:
    resources:
      limits:
        memory: 4G
      reservations:
        memory: 2G
```

#### Permission Issues with Volumes

**Symptoms**: Cannot read/write files, permission denied errors

**Diagnosis**:
```bash
# Check volume permissions
docker volume inspect mcf-faces_photos_data

# Check container user
docker-compose exec api whoami
docker-compose exec api ls -la /app/backend/data
```

**Solutions**:
```bash
# Fix permissions on volume
VOLUME_PATH=$(docker volume inspect mcf-faces_photos_data --format '{{ .Mountpoint }}')
sudo chown -R 1000:1000 "$VOLUME_PATH"

# Or run container as root (not recommended for production)
docker-compose exec -u root api bash
```

#### API Can't Access Photos

**Symptoms**: API returns 404 for photos, empty gallery

**Diagnosis**:
```bash
# Check if photos exist in volume
docker-compose exec api ls -la /app/backend/data/photos

# Check API logs
docker-compose logs api | grep -i "error\|exception"

# Test API endpoint
curl http://localhost:8000/stats
```

**Solutions**:
- Verify photos were copied to correct volume
- Check volume mounts in docker-compose.yml
- Ensure processing was run successfully
- Check file permissions

#### Face Detection Not Working

**Symptoms**: No faces detected, processing completes but no results

**Diagnosis**:
```bash
# Run processing with verbose output
docker-compose exec api python backend/process_photos.py --stats

# Check if face_recognition library is working
docker-compose exec api python -c "import face_recognition; print('OK')"
```

**Solutions**:
- Check photo format and quality
- Try with known good photos
- Adjust detection parameters
- Verify dlib installation:

```bash
docker-compose exec api python -c "import dlib; print(dlib.__version__)"
```

#### Build Failures

**Symptoms**: Docker build fails with errors

**Solutions**:
```bash
# Clean Docker build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check for syntax errors in Dockerfiles
docker build -f Dockerfile.api -t test .
```

#### Network Issues Between Containers

**Symptoms**: Web can't reach API, connection refused

**Diagnosis**:
```bash
# Check network
docker network ls | grep mcf
docker network inspect mcf-faces_mcf-network

# Test connectivity
docker-compose exec web ping api
docker-compose exec web nc -zv api 8000
```

**Solutions**:
- Verify all services are on same network
- Check service names match docker-compose.yml
- Restart Docker daemon:

```bash
sudo systemctl restart docker
docker-compose up -d
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# View specific service logs
docker-compose logs api
docker-compose logs web

# View last N lines
docker-compose logs --tail=100 api

# View logs since specific time
docker-compose logs --since 2024-01-01T00:00:00 api
```

### Container Resource Usage

```bash
# View real-time resource usage
docker stats

# View specific container
docker stats mcf-faces-api

# View resource limits
docker inspect mcf-faces-api --format='{{.HostConfig.Memory}}'
```

### Entering Container for Debugging

```bash
# Enter API container
docker-compose exec api bash

# Enter as root
docker-compose exec -u root api bash

# Run one-off command
docker-compose exec api python backend/process_photos.py --stats

# Start a shell in stopped container
docker-compose run --rm api bash
```

### Testing Individual Components

```bash
# Test API directly
docker-compose exec api python api/server.py

# Test face detection
docker-compose exec api python -c "
import face_recognition
import numpy as np
img = np.zeros((100, 100, 3), dtype=np.uint8)
locations = face_recognition.face_locations(img)
print('Face detection working:', len(locations) >= 0)
"

# Test file system access
docker-compose exec api ls -R /app/backend/data
```

## Monitoring and Maintenance

### Resource Monitoring

#### Docker Stats

```bash
# Real-time resource usage
docker stats

# Continuous monitoring with auto-refresh
watch -n 5 'docker stats --no-stream'
```

#### System Monitoring

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Disk I/O
iotop

# Network usage
iftop
```

### Log Rotation Setup

Docker logs can grow large. Configure log rotation:

#### Method 1: Docker Daemon Configuration

Edit `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

#### Method 2: Per-Container Configuration

In `docker-compose.yml`:

```yaml
api:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### Health Checks

Health checks are already configured in docker-compose.yml. Monitor them:

```bash
# View health status
docker-compose ps

# View health check logs
docker inspect mcf-faces-api --format='{{json .State.Health}}' | jq
```

### Automatic Container Restart Policies

Already configured in docker-compose.yml as `restart: unless-stopped`. This means:
- Containers restart automatically on failure
- Containers restart after server reboot
- Containers don't restart if manually stopped

### Cleanup of Unused Docker Resources

```bash
# Remove unused containers, networks, images
docker system prune

# Remove unused volumes (BE CAREFUL!)
docker system prune --volumes

# Remove old/dangling images
docker image prune -a

# View what will be cleaned before doing it
docker system prune --dry-run
```

### Automated Maintenance Tasks

Create a maintenance script:

```bash
#!/bin/bash
# maintenance.sh

# Cleanup old logs
find /var/log -type f -name "*.log" -mtime +30 -delete

# Prune Docker resources
docker system prune -f

# Backup data
/home/deployer/mcf-faces/scripts/backup-data.sh /home/deployer/backups

# Remove old backups (keep last 7 days)
find /home/deployer/backups -type f -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
# Run weekly maintenance on Sunday at 2 AM
0 2 * * 0 /home/deployer/maintenance.sh >> /home/deployer/maintenance.log 2>&1
```

### Monitoring Disk Space

```bash
# Check disk usage
df -h

# Check Docker volumes
docker system df -v

# Find large files
du -sh /var/lib/docker/volumes/* | sort -h

# Alert if disk space low
DISK_USAGE=$(df -h / | grep -vE '^Filesystem' | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "Warning: Disk usage is above 80%"
fi
```

### Updating Dependencies

#### Python Dependencies

```bash
# Update requirements.txt if needed
docker-compose exec api pip list --outdated

# Rebuild to get new dependencies
docker-compose build api
docker-compose up -d api
```

#### Node Dependencies

```bash
# Check for updates
cd web
npm outdated

# Update package.json and rebuild
docker-compose build web
docker-compose up -d web
```

### Performance Optimization

1. **Enable build cache**: Docker BuildKit speeds up builds
```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

2. **Optimize image sizes**: Already using multi-stage builds

3. **Use volumes for node_modules**: Avoid copying large directories

4. **Increase processing speed**: Adjust parallel processing in process_photos.py

### Best Practices

1. **Regular backups**: Run backup script daily
2. **Monitor disk space**: Set up alerts for >80% usage
3. **Update regularly**: Keep Docker, dependencies, and OS updated
4. **Test updates**: Test in staging environment first
5. **Keep logs**: Retain logs for troubleshooting
6. **Document changes**: Keep notes of configuration changes
7. **Security updates**: Apply security patches promptly

## Cost Estimation

### Monthly Operating Costs

**Hetzner CPX21** (Recommended for small to medium collections):
- **Cost**: €7.49/month (~$8/month)
- **Capacity**: ~10,000-20,000 photos
- **Suitable for**: Personal/family use

**Hetzner CPX31** (Recommended for large collections):
- **Cost**: €13.90/month (~$15/month)
- **Capacity**: ~50,000+ photos
- **Suitable for**: Large family archives, multiple families

**Additional Costs**:
- **Domain name**: $10-15/year
- **SSL certificate**: Free (Let's Encrypt)
- **Backup storage**: $5-10/month (optional, use provider's backup service)

**Total monthly cost**: $8-20/month depending on size

## Support and Community

For issues, questions, or contributions:

- **GitHub Issues**: https://github.com/yourusername/mcf-faces/issues
- **Discussions**: https://github.com/yourusername/mcf-faces/discussions
- **Documentation**: https://github.com/yourusername/mcf-faces/wiki

## License

This project is licensed under the MIT License. See LICENSE file for details.
