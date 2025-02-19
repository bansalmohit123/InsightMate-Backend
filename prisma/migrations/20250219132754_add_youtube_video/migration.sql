-- CreateTable
CREATE TABLE "YouTubeVideo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "YouTubeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeVideo_url_key" ON "YouTubeVideo"("url");

-- AddForeignKey
ALTER TABLE "YouTubeVideo" ADD CONSTRAINT "YouTubeVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
