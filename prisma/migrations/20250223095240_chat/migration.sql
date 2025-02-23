/*
  Warnings:

  - Added the required column `description` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `URLDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `URLDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `YouTubeVideo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "URLDocument" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "YouTubeVideo" ADD COLUMN     "description" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ChatbotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatbotType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatbotSession" ADD CONSTRAINT "ChatbotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatbotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
