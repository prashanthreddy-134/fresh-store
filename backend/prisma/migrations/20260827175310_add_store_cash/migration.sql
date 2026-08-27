-- CreateEnum
CREATE TYPE "StoreCashTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "StoreCash" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCashTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeCashId" TEXT NOT NULL,
    "type" "StoreCashTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCash_userId_key" ON "StoreCash"("userId");

-- CreateIndex
CREATE INDEX "StoreCashTransaction_userId_idx" ON "StoreCashTransaction"("userId");

-- CreateIndex
CREATE INDEX "StoreCashTransaction_storeCashId_idx" ON "StoreCashTransaction"("storeCashId");

-- CreateIndex
CREATE INDEX "StoreCashTransaction_createdAt_idx" ON "StoreCashTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "StoreCash" ADD CONSTRAINT "StoreCash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCashTransaction" ADD CONSTRAINT "StoreCashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCashTransaction" ADD CONSTRAINT "StoreCashTransaction_storeCashId_fkey" FOREIGN KEY ("storeCashId") REFERENCES "StoreCash"("id") ON DELETE CASCADE ON UPDATE CASCADE;
