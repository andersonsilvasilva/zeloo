-- Torna opened_by_id/closed_by_id anuláveis e troca a FK pra ON DELETE SET NULL,
-- igual ao padrão já usado em Client.user, Professional.user, Appointment.createdBy,
-- Payment.receivedBy, CashbookEntry.createdBy, MessageLog.sentBy, AuditLog.user.
-- Sem isso, excluir um usuário que já abriu/fechou caixa é bloqueado (RESTRICT).

ALTER TABLE `cash_registers` MODIFY `opened_by_id` VARCHAR(191) NULL;
ALTER TABLE `cash_registers` DROP FOREIGN KEY `cash_registers_opened_by_id_fkey`;
ALTER TABLE `cash_registers` ADD CONSTRAINT `cash_registers_opened_by_id_fkey` FOREIGN KEY (`opened_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cash_register_closings` MODIFY `closed_by_id` VARCHAR(191) NULL;
ALTER TABLE `cash_register_closings` DROP FOREIGN KEY `cash_register_closings_closed_by_id_fkey`;
ALTER TABLE `cash_register_closings` ADD CONSTRAINT `cash_register_closings_closed_by_id_fkey` FOREIGN KEY (`closed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
