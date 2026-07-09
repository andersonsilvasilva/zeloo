-- AlterTable
ALTER TABLE `services` ADD COLUMN `default_message_template_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_default_message_template_id_fkey` FOREIGN KEY (`default_message_template_id`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
