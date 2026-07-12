-- Add account-lockout fields to users
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMP(3);

-- Create revoked_tokens table for JWT blacklist
CREATE TABLE "revoked_tokens" (
    "id"         TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revoked_tokens_token_key" ON "revoked_tokens"("token");
