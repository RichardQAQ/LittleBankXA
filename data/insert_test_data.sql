-- This file contains test data for the initial database setup.
-- It uses multiple-statement inserts for efficiency.

-- Insert a single user for the application
INSERT INTO `users` (`id`, `username`) VALUES
(1, 'Default User');

-- Insert some default stocks
INSERT INTO `stocks` (`id`, `symbol`, `name`, `current_price`, `change_percent`) VALUES
(1, 'AAPL', 'Apple Inc.', 190.00, 1.25),
(2, 'GOOGL', 'Alphabet Inc.', 140.50, -0.50),
(3, 'MSFT', 'Microsoft Corporation', 420.75, 0.80);

-- Insert a default bond
INSERT INTO `bonds` (`id`, `symbol`, `name`, `face_value`, `coupon_rate`, `maturity_date`, `current_price`) VALUES
(1, 'US10Y', 'US 10-Year Treasury', 1000.00, 4.25, '2034-01-01', 995.00);

-- Insert portfolio items for the default user
INSERT INTO `portfolio` (`user_id`, `asset_type`, `asset_id`, `quantity`, `purchase_price`, `purchase_date`) VALUES
(1, 'stock', 1, 50, 175.50, '2024-01-15'),
(1, 'stock', 2, 25, 130.20, '2024-02-10'),
(1, 'bond', 1, 10, 990.00, '2024-03-05');