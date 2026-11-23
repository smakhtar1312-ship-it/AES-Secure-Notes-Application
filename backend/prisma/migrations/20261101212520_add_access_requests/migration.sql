-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "noteId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccessRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccessRequest_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AccessRequest_adminId_idx" ON "AccessRequest"("adminId");

-- CreateIndex
CREATE INDEX "AccessRequest_userId_status_idx" ON "AccessRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_noteId_idx" ON "AccessRequest"("noteId");

-- CreateIndex
CREATE INDEX "AccessRequest_expiresAt_idx" ON "AccessRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_noteId_idx" ON "AuditLog"("noteId");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");
