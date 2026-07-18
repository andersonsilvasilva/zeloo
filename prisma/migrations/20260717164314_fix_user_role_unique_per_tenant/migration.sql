-- CreateIndex (suporte pra FK de user_id, que dependia do índice antigo abaixo)
CREATE INDEX `user_roles_user_id_fkey` ON `user_roles`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `user_roles_tenant_id_user_id_role_id_key` ON `user_roles`(`tenant_id`, `user_id`, `role_id`);

-- DropIndex
ALTER TABLE `user_roles` DROP INDEX `user_roles_user_id_role_id_key`;
