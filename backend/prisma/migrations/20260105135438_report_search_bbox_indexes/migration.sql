-- CreateIndex
CREATE INDEX "report_latitude_longitude_idx" ON "report"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "report_category_idx" ON "report"("category");
