CREATE TABLE IF NOT EXISTS `customer_prices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `price` int NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_prices_customer_product_uq` (`customer_id`, `product_id`)
);

ALTER TABLE `supplier_invoice_items`
  ADD COLUMN `discount_percent` int NOT NULL DEFAULT 0,
  ADD COLUMN `ppn_percent` int NOT NULL DEFAULT 0;

ALTER TABLE `invoice_items`
  ADD COLUMN `discount_percent` int NOT NULL DEFAULT 0,
  ADD COLUMN `ppn_percent` int NOT NULL DEFAULT 0;
