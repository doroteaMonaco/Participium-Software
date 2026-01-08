-- CreateTable
CREATE TABLE "pending_verification_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "verificationCodeHash" TEXT NOT NULL,
    "verificationCodeExpiry" TIMESTAMP(3) NOT NULL,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_verification_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_verification_user_username_key" ON "pending_verification_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "pending_verification_user_email_key" ON "pending_verification_user"("email");
