/*
  Warnings:

  - You are about to drop the `monitored_page` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "monitored_page" DROP CONSTRAINT "monitored_page_domain_id_fkey";

-- DropTable
DROP TABLE "monitored_page";
