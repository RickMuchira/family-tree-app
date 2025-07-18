-- Migration to add profilePhoto field to Person table
-- Run this after updating your schema.prisma file

-- Add the profilePhoto column to the persons table
ALTER TABLE persons ADD COLUMN profilePhoto TEXT;

-- Optional: Add an index for better performance when filtering by photos
CREATE INDEX idx_persons_profile_photo ON persons(profilePhoto) WHERE profilePhoto IS NOT NULL;

-- Update statistics (SQLite specific)
ANALYZE persons;
