-- Referencia opcional a la reserva de WhatsApp que originó el último aviso.
-- 100% ADITIVO: no borra ni modifica productos, ventas, stock o reservas.

ALTER TABLE "MarketplaceRemovalNotification"
ADD COLUMN "lastReservationId" TEXT;
