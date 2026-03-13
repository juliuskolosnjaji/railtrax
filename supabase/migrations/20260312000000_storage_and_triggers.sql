-- ============================================================
-- Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('tickets', 'tickets', false),
  ('journal-photos', 'journal-photos', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS: tickets bucket — users can only access their own files
-- ============================================================
DROP POLICY IF EXISTS "Users can upload own tickets" ON storage.objects;
CREATE POLICY "Users can upload own tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read own tickets" ON storage.objects;
CREATE POLICY "Users can read own tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own tickets" ON storage.objects;
CREATE POLICY "Users can delete own tickets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- RLS: journal-photos bucket
-- ============================================================
DROP POLICY IF EXISTS "Users can upload own journal photos" ON storage.objects;
CREATE POLICY "Users can upload own journal photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read own journal photos" ON storage.objects;
CREATE POLICY "Users can read own journal photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own journal photos" ON storage.objects;
CREATE POLICY "Users can delete own journal photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- RLS: avatars bucket — public read, own write
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- Usage counter triggers
-- ============================================================

-- trips_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION increment_trips_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_counters (user_id, trips_count)
    VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id)
    DO UPDATE SET
      trips_count = usage_counters.trips_count + 1,
      updated_at  = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_trips_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usage_counters
  SET trips_count = GREATEST(trips_count - 1, 0),
      updated_at  = now()
  WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_count_insert ON trips;
CREATE TRIGGER trg_trips_count_insert
  AFTER INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION increment_trips_count();

DROP TRIGGER IF EXISTS trg_trips_count_delete ON trips;
CREATE TRIGGER trg_trips_count_delete
  AFTER DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION decrement_trips_count();

-- legs_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION increment_legs_count()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM trips WHERE id = NEW.trip_id;
  INSERT INTO usage_counters (user_id, legs_count)
    VALUES (v_user_id, 1)
  ON CONFLICT (user_id)
    DO UPDATE SET
      legs_count = usage_counters.legs_count + 1,
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_legs_count()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM trips WHERE id = OLD.trip_id;
  UPDATE usage_counters
  SET legs_count = GREATEST(legs_count - 1, 0),
      updated_at = now()
  WHERE user_id = v_user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legs_count_insert ON legs;
CREATE TRIGGER trg_legs_count_insert
  AFTER INSERT ON legs
  FOR EACH ROW EXECUTE FUNCTION increment_legs_count();

DROP TRIGGER IF EXISTS trg_legs_count_delete ON legs;
CREATE TRIGGER trg_legs_count_delete
  AFTER DELETE ON legs
  FOR EACH ROW EXECUTE FUNCTION decrement_legs_count();

-- photos_count: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION increment_photos_count()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM journal_entries WHERE id = NEW.entry_id;
  INSERT INTO usage_counters (user_id, photos_count)
    VALUES (v_user_id, 1)
  ON CONFLICT (user_id)
    DO UPDATE SET
      photos_count = usage_counters.photos_count + 1,
      updated_at   = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_photos_count()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM journal_entries WHERE id = OLD.entry_id;
  UPDATE usage_counters
  SET photos_count = GREATEST(photos_count - 1, 0),
      updated_at   = now()
  WHERE user_id = v_user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photos_count_insert ON journal_photos;
CREATE TRIGGER trg_photos_count_insert
  AFTER INSERT ON journal_photos
  FOR EACH ROW EXECUTE FUNCTION increment_photos_count();

DROP TRIGGER IF EXISTS trg_photos_count_delete ON journal_photos;
CREATE TRIGGER trg_photos_count_delete
  AFTER DELETE ON journal_photos
  FOR EACH ROW EXECUTE FUNCTION decrement_photos_count();
