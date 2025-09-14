
-- Update existing campaigns to have the Every.org donation URL
UPDATE campaigns SET every_org_url = 'https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card' WHERE every_org_url IS NULL;
