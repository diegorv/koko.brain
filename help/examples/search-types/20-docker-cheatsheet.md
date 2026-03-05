---
tags: [devops, docker, reference]
date: 2025-01-05
---

# Docker Quick Reference

## Container lifecycle
```bash
docker run -d --name myapp -p 3000:3000 myimage:latest
docker stop myapp
docker start myapp
docker restart myapp
docker rm myapp          # must be stopped first
docker rm -f myapp       # force remove running container
```

## Images
```bash
docker build -t myapp:v1 .
docker images            # list all images
docker rmi myapp:v1      # remove image
docker pull postgres:16
docker push myregistry/myapp:v1
```

## Debugging
```bash
docker logs myapp -f --tail 100    # follow last 100 lines
docker exec -it myapp /bin/sh      # shell into container
docker inspect myapp               # detailed container info
docker stats                       # live resource usage
```

## Docker Compose
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=secret

volumes:
  pgdata:
```

## Common gotchas
- Container filesystem is ephemeral — use volumes for persistent data
- `docker-compose up` doesn't rebuild images. Use `--build` flag.
- Port mapping is `host:container`. `3000:80` means host port 3000 → container port 80
- Use `.dockerignore` to exclude `node_modules`, `.git`, etc. from build context
