ALTER TABLE generated_clips
ADD COLUMN IF NOT EXISTS focus_status VARCHAR(20) NOT NULL DEFAULT 'ready';

ALTER TABLE generated_clips
ADD COLUMN IF NOT EXISTS focus_error TEXT;
