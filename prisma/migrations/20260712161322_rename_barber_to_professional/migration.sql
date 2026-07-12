-- Rename Barber -> Professional preservando dados (RENAME/CHANGE, nunca DROP/CREATE)

-- 1) Expande o enum pra aceitar o novo valor ANTES do UPDATE (senão o MySQL
--    rejeita a escrita por não existir ainda na definição da coluna), depois
--    atualiza os dados, depois estreita o enum removendo o valor antigo.
ALTER TABLE `media` MODIFY `media_type` ENUM('LOGO', 'CLIENT_PROFILE', 'BARBER_PROFILE', 'PROFESSIONAL_PROFILE', 'SERVICE_ADVERTISING') NOT NULL;
UPDATE `media` SET `media_type` = 'PROFESSIONAL_PROFILE' WHERE `media_type` = 'BARBER_PROFILE';

-- 2) Solta as FKs que referenciam o que vai ser renomeado
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_barber_id_fkey`;
ALTER TABLE `barber_services` DROP FOREIGN KEY `barber_services_barber_id_fkey`;
ALTER TABLE `barber_services` DROP FOREIGN KEY `barber_services_service_id_fkey`;
ALTER TABLE `barbers` DROP FOREIGN KEY `barbers_profile_image_id_fkey`;
ALTER TABLE `barbers` DROP FOREIGN KEY `barbers_user_id_fkey`;
ALTER TABLE `clients` DROP FOREIGN KEY `clients_preferred_barber_id_fkey`;

-- 3) Renomeia as tabelas (preserva todas as linhas)
RENAME TABLE `barbers` TO `professionals`;
RENAME TABLE `barber_services` TO `professional_services`;

-- 4) Renomeia as colunas (preserva os valores)
ALTER TABLE `professional_services` CHANGE COLUMN `barber_id` `professional_id` VARCHAR(191) NOT NULL;
ALTER TABLE `appointments` CHANGE COLUMN `barber_id` `professional_id` VARCHAR(191) NOT NULL;
ALTER TABLE `clients` CHANGE COLUMN `preferred_barber_id` `preferred_professional_id` VARCHAR(191) NULL;

-- 5) Atualiza a definição do enum (dados já migrados no passo 1)
ALTER TABLE `media` MODIFY `media_type` ENUM('LOGO', 'CLIENT_PROFILE', 'PROFESSIONAL_PROFILE', 'SERVICE_ADVERTISING') NOT NULL;

-- 6) Renomeia os índices pra bater com a convenção do Prisma
ALTER TABLE `professionals` RENAME INDEX `barbers_user_id_key` TO `professionals_user_id_key`;
ALTER TABLE `professionals` RENAME INDEX `barbers_status_idx` TO `professionals_status_idx`;
ALTER TABLE `professional_services` RENAME INDEX `barber_services_barber_id_service_id_key` TO `professional_services_professional_id_service_id_key`;
ALTER TABLE `appointments` RENAME INDEX `appointments_barber_id_idx` TO `appointments_professional_id_idx`;
ALTER TABLE `clients` RENAME INDEX `clients_preferred_barber_id_idx` TO `clients_preferred_professional_id_idx`;

-- 7) Recria as FKs com os nomes/colunas novos
ALTER TABLE `professionals` ADD CONSTRAINT `professionals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `professionals` ADD CONSTRAINT `professionals_profile_image_id_fkey` FOREIGN KEY (`profile_image_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `professional_services` ADD CONSTRAINT `professional_services_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `professional_services` ADD CONSTRAINT `professional_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `clients` ADD CONSTRAINT `clients_preferred_professional_id_fkey` FOREIGN KEY (`preferred_professional_id`) REFERENCES `professionals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 8) Renomeia os dados de papel/permissão (preserva os vínculos existentes via UPDATE, não upsert)
UPDATE `roles` SET `slug` = 'PROFESSIONAL', `name` = 'PROFESSIONAL' WHERE `slug` = 'BARBER';
UPDATE `permissions` SET `slug` = REPLACE(`slug`, 'barbers.', 'professionals.'), `name` = REPLACE(`name`, 'barbers.', 'professionals.') WHERE `slug` LIKE 'barbers.%';

-- 9) Corrige o placeholder salvo dentro do texto de modelos de mensagem existentes
UPDATE `message_templates` SET `content` = REPLACE(`content`, '{{barber_agendado}}', '{{professional_agendado}}') WHERE `content` LIKE '%{{barber_agendado}}%';
