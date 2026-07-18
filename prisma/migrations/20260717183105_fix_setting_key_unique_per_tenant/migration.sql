-- DropIndex
ALTER TABLE `settings` DROP INDEX `settings_key_key`;

-- CreateIndex
CREATE UNIQUE INDEX `settings_tenant_id_key_key` ON `settings`(`tenant_id`, `key`);
