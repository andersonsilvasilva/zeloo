-- DropForeignKey
ALTER TABLE `appointment_services` DROP FOREIGN KEY `appointment_services_service_id_fkey`;

-- AlterTable
ALTER TABLE `audit_logs` MODIFY `old_values` JSON NULL,
    MODIFY `new_values` JSON NULL;

-- AlterTable
ALTER TABLE `message_templates` MODIFY `variables` JSON NULL;

-- AlterTable
ALTER TABLE `professionals` MODIFY `working_hours` JSON NULL;

-- CreateTable
CREATE TABLE `recurring_account_entries` (
    `id` VARCHAR(191) NOT NULL,
    `direction` ENUM('PAYABLE', 'RECEIVABLE') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `category` VARCHAR(191) NULL,
    `counterparty_name` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `day_of_month` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `recurring_account_entries_direction_active_idx`(`direction`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_entries` (
    `id` VARCHAR(191) NOT NULL,
    `direction` ENUM('PAYABLE', 'RECEIVABLE') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `category` VARCHAR(191) NULL,
    `counterparty_name` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `due_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'SETTLED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `settled_at` DATETIME(3) NULL,
    `payment_method` ENUM('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER') NULL,
    `cashbook_entry_id` VARCHAR(191) NULL,
    `recurring_entry_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `account_entries_cashbook_entry_id_key`(`cashbook_entry_id`),
    INDEX `account_entries_direction_status_idx`(`direction`, `status`),
    INDEX `account_entries_due_date_idx`(`due_date`),
    UNIQUE INDEX `account_entries_recurring_entry_id_due_date_key`(`recurring_entry_id`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_closings` (
    `id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `calculated_amount` DECIMAL(12, 2) NOT NULL,
    `final_amount` DECIMAL(12, 2) NOT NULL,
    `adjustment_notes` TEXT NULL,
    `cashbook_entry_id` VARCHAR(191) NULL,
    `closed_by_id` VARCHAR(191) NULL,
    `closed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `commission_closings_cashbook_entry_id_key`(`cashbook_entry_id`),
    INDEX `commission_closings_professional_id_idx`(`professional_id`),
    UNIQUE INDEX `commission_closings_professional_id_period_start_period_end_key`(`professional_id`, `period_start`, `period_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_account_entries` ADD CONSTRAINT `recurring_account_entries_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_account_entries` ADD CONSTRAINT `recurring_account_entries_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_entries` ADD CONSTRAINT `account_entries_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_entries` ADD CONSTRAINT `account_entries_cashbook_entry_id_fkey` FOREIGN KEY (`cashbook_entry_id`) REFERENCES `cashbook_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_entries` ADD CONSTRAINT `account_entries_recurring_entry_id_fkey` FOREIGN KEY (`recurring_entry_id`) REFERENCES `recurring_account_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_entries` ADD CONSTRAINT `account_entries_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_closings` ADD CONSTRAINT `commission_closings_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_closings` ADD CONSTRAINT `commission_closings_cashbook_entry_id_fkey` FOREIGN KEY (`cashbook_entry_id`) REFERENCES `cashbook_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_closings` ADD CONSTRAINT `commission_closings_closed_by_id_fkey` FOREIGN KEY (`closed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

