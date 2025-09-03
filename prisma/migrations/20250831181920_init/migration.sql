-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Scan" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "public"."ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalLinks" INTEGER DEFAULT 0,
    "okCount" INTEGER DEFAULT 0,
    "brokenCount" INTEGER DEFAULT 0,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScanItem" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "statusText" TEXT,
    "redirected" BOOLEAN,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'User',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScanItem_scanId_idx" ON "public"."ScanItem"("scanId");

-- CreateIndex
CREATE INDEX "ScanItem_ok_idx" ON "public"."ScanItem"("ok");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."ScanItem" ADD CONSTRAINT "ScanItem_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "public"."Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
