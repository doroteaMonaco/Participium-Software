-- CreateTable
CREATE TABLE "comment" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "municipality_user_id" INTEGER,
    "external_maintainer_id" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_reportId_idx" ON "comment"("reportId");

-- CreateIndex
CREATE INDEX "comment_municipality_user_id_idx" ON "comment"("municipality_user_id");

-- CreateIndex
CREATE INDEX "comment_external_maintainer_id_idx" ON "comment"("external_maintainer_id");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_municipality_user_id_fkey" FOREIGN KEY ("municipality_user_id") REFERENCES "municipality_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_external_maintainer_id_fkey" FOREIGN KEY ("external_maintainer_id") REFERENCES "external_maintainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
