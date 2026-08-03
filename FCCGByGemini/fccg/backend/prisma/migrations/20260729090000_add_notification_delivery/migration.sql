CREATE TABLE "NotificationDelivery" (
    "id" SERIAL NOT NULL,
    "deliveryKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientId" INTEGER,
    "recipientEmail" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_deliveryKey_key"
ON "NotificationDelivery"("deliveryKey");

CREATE INDEX "NotificationDelivery_type_status_idx"
ON "NotificationDelivery"("type", "status");
