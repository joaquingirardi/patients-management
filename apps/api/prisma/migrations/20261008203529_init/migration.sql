-- Trigram matching powers index-assisted substring search (ILIKE '%term%').
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "role" "role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone_number" VARCHAR(16) NOT NULL,
    "dob" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "patients_organization_id_last_name_first_name_id_idx" ON "patients"("organization_id", "last_name", "first_name", "id");

-- CreateIndex
CREATE INDEX "patients_organization_id_first_name_last_name_id_idx" ON "patients"("organization_id", "first_name", "last_name", "id");

-- CreateIndex
CREATE INDEX "patients_organization_id_dob_id_idx" ON "patients"("organization_id", "dob", "id");

-- CreateIndex
CREATE INDEX "patients_organization_id_created_at_id_idx" ON "patients"("organization_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "patients_first_name_trgm_idx" ON "patients" USING GIN ("first_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "patients_last_name_trgm_idx" ON "patients" USING GIN ("last_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "patients_email_trgm_idx" ON "patients" USING GIN ("email" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Invariants Prisma's schema language cannot express. The API validates all of
-- these already; the database enforces them anyway (defence in depth: scripts,
-- future services and manual fixes cannot corrupt the data either).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_chk" CHECK ("email" = lower("email"));

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_first_name_not_blank_chk" CHECK (char_length(btrim("first_name")) > 0),
  ADD CONSTRAINT "patients_last_name_not_blank_chk" CHECK (char_length(btrim("last_name")) > 0),
  ADD CONSTRAINT "patients_email_lowercase_chk" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "patients_phone_e164_chk" CHECK ("phone_number" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "patients_dob_range_chk" CHECK ("dob" >= DATE '1900-01-01'),
  ADD CONSTRAINT "patients_version_positive_chk" CHECK ("version" > 0);
