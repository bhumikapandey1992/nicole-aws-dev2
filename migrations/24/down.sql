
-- Remove the Every.org URLs if we need to rollback
UPDATE campaigns SET every_org_url = NULL WHERE every_org_url = 'https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card';
