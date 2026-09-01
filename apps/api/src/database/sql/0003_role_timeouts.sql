-- Lock and statement timeouts at the role level.
-- Without a lock timeout, one hung transaction on an occurrence row blocks
-- every other RSVP for that occurrence indefinitely; 55P03 is mapped to
-- HTTP 503 + Retry-After at the API layer.
-- The RSVP write path additionally sets stricter SET LOCAL values in-transaction.
ALTER ROLE dnc SET lock_timeout = '3s';
ALTER ROLE dnc SET statement_timeout = '10s';
ALTER ROLE dnc SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE dnc SET timezone = 'UTC';
