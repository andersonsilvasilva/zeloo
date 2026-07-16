-- AlterTable
ALTER TABLE `account_entries` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cash_register_closings` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cash_registers` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `cashbook_entries` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `commission_closings` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `media` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `message_logs` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `message_templates` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pix_charges` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `professionals` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `recurring_account_entries` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `services` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user_roles` ADD COLUMN `tenant_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `account_entries_tenant_id_idx` ON `account_entries`(`tenant_id`);

-- CreateIndex
CREATE INDEX `appointments_tenant_id_idx` ON `appointments`(`tenant_id`);

-- CreateIndex
CREATE INDEX `audit_logs_tenant_id_idx` ON `audit_logs`(`tenant_id`);

-- CreateIndex
CREATE INDEX `cash_register_closings_tenant_id_idx` ON `cash_register_closings`(`tenant_id`);

-- CreateIndex
CREATE INDEX `cash_registers_tenant_id_idx` ON `cash_registers`(`tenant_id`);

-- CreateIndex
CREATE INDEX `cashbook_entries_tenant_id_idx` ON `cashbook_entries`(`tenant_id`);

-- CreateIndex
CREATE INDEX `clients_tenant_id_idx` ON `clients`(`tenant_id`);

-- CreateIndex
CREATE INDEX `commission_closings_tenant_id_idx` ON `commission_closings`(`tenant_id`);

-- CreateIndex
CREATE INDEX `media_tenant_id_idx` ON `media`(`tenant_id`);

-- CreateIndex
CREATE INDEX `message_logs_tenant_id_idx` ON `message_logs`(`tenant_id`);

-- CreateIndex
CREATE INDEX `message_templates_tenant_id_idx` ON `message_templates`(`tenant_id`);

-- CreateIndex
CREATE INDEX `payments_tenant_id_idx` ON `payments`(`tenant_id`);

-- CreateIndex
CREATE INDEX `pix_charges_tenant_id_idx` ON `pix_charges`(`tenant_id`);

-- CreateIndex
CREATE INDEX `professionals_tenant_id_idx` ON `professionals`(`tenant_id`);

-- CreateIndex
CREATE INDEX `recurring_account_entries_tenant_id_idx` ON `recurring_account_entries`(`tenant_id`);

-- CreateIndex
CREATE INDEX `services_tenant_id_idx` ON `services`(`tenant_id`);

-- CreateIndex
CREATE INDEX `settings_tenant_id_idx` ON `settings`(`tenant_id`);

-- CreateIndex
CREATE INDEX `user_roles_tenant_id_idx` ON `user_roles`(`tenant_id`);

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professionals` ADD CONSTRAINT `professionals_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pix_charges` ADD CONSTRAINT `pix_charges_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cashbook_entries` ADD CONSTRAINT `cashbook_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cash_register_closings` ADD CONSTRAINT `cash_register_closings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_account_entries` ADD CONSTRAINT `recurring_account_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_entries` ADD CONSTRAINT `account_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_closings` ADD CONSTRAINT `commission_closings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

