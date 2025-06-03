-- Increase max_allowed_packet size
SET GLOBAL max_allowed_packet=67108864; -- 64MB

-- Show current value
SHOW VARIABLES LIKE 'max_allowed_packet';
