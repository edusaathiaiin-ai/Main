-- Add 'approved' status for admin-approved deletion requests awaiting processing
ALTER TABLE dpdp_requests DROP CONSTRAINT IF EXISTS dpdp_requests_status_check;
ALTER TABLE dpdp_requests ADD CONSTRAINT dpdp_requests_status_check
  CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'rejected'));
