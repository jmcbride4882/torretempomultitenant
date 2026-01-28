-- Torre Tempo - Database Initialization
-- This script runs once when the database is first created

-- Create app settings namespace for RLS
-- The application will set app.current_tenant on each request

-- Note: RLS policies will be added via Prisma migrations after tables are created
-- This file sets up any PostgreSQL extensions and initial configuration

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log that initialization is complete
DO $$
BEGIN
  RAISE NOTICE 'Torre Tempo database initialized successfully';
END $$;
