-- DropIndex
ALTER TABLE `services` DROP INDEX `services_slug_key`;

-- CreateIndex
CREATE UNIQUE INDEX `services_tenant_id_slug_key` ON `services`(`tenant_id`, `slug`);
