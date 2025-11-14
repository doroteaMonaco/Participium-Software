/*
  Warnings:

  - Added the required column `category` to the `report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `report` table without a default value. This is not possible if the table is not empty.
  - Made the column `latitude` on table `report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `report` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Category" AS ENUM ('WATER_SUPPLY_DRINKING_WATER', 'ARCHITECTURAL_BARRIERS', 'SEWER_SYSTEM', 'PUBLIC_LIGHTING', 'WASTE', 'ROAD_SIGNS_TRAFFIC_LIGHTS', 'ROADS_URBAN_FURNISHINGS', 'PUBLIC_GREEN_AREAS_PLAYGROUNDS', 'OTHER');

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "category" "Category" NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "photos" TEXT[],
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;
