# Database & Migrations

## PostgreSQL 16 & SQLAlchemy 2.x

APTLY uses PostgreSQL 16 with UUIDv4 primary keys, timestamps with timezone, and soft deletion.

## Migrations (Alembic)

Alembic manages async database migrations.

### Generate a Migration

```bash
cd apps/api
alembic revision --autogenerate -m "describe_change"
```

### Apply Migrations

```bash
cd apps/api
alembic upgrade head
```

### Rollback Migration

```bash
cd apps/api
alembic downgrade -1
```

## Docker Container

The PostgreSQL container is initialized with `infrastructure/docker/postgres/init.sql`, enabling the `uuid-ossp` and `pgcrypto` extensions. `pgcrypto` is required by the Alembic UUID defaults that call `gen_random_uuid()`.
