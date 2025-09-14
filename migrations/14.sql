
ALTER TABLE pledges ADD COLUMN pledge_type TEXT DEFAULT 'per_unit_uncapped';
ALTER TABLE pledges ADD COLUMN max_total_amount REAL;
ALTER TABLE pledges ADD COLUMN flat_amount REAL;
