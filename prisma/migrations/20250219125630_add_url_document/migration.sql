-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "URLDocument" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "URLDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "URLDocument_url_key" ON "URLDocument"("url");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "URLDocument" ADD CONSTRAINT "URLDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
