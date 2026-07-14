-- CreateTable
CREATE TABLE `pix_charges` (
    `id` VARCHAR(191) NOT NULL,
    `appointment_id` VARCHAR(191) NOT NULL,
    `mercado_pago_payment_id` VARCHAR(191) NOT NULL,
    `qr_code` TEXT NOT NULL,
    `qr_code_base64` TEXT NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NULL,
    `payment_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pix_charges_mercado_pago_payment_id_key`(`mercado_pago_payment_id`),
    UNIQUE INDEX `pix_charges_payment_id_key`(`payment_id`),
    INDEX `pix_charges_appointment_id_idx`(`appointment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
