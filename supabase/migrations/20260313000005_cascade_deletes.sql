-- Drop existing FK constraints and re-add with ON DELETE CASCADE / SET NULL

-- legs.trip_id → trips.id  (cascade: delete legs when trip is deleted)
ALTER TABLE legs
  DROP CONSTRAINT IF EXISTS legs_trip_id_fkey,
  ADD CONSTRAINT legs_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

-- route_reviews.leg_id → legs.id  (cascade: delete reviews when leg is deleted)
ALTER TABLE route_reviews
  DROP CONSTRAINT IF EXISTS route_reviews_leg_id_fkey,
  ADD CONSTRAINT route_reviews_leg_id_fkey
    FOREIGN KEY (leg_id) REFERENCES legs(id) ON DELETE CASCADE;

-- leg_rolling_stock.leg_id → legs.id  (cascade: delete rolling stock link when leg is deleted)
ALTER TABLE leg_rolling_stock
  DROP CONSTRAINT IF EXISTS leg_rolling_stock_leg_id_fkey,
  ADD CONSTRAINT leg_rolling_stock_leg_id_fkey
    FOREIGN KEY (leg_id) REFERENCES legs(id) ON DELETE CASCADE;

-- journal_entries.leg_id → legs.id  (set null: keep journal entry if leg is deleted)
ALTER TABLE journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_leg_id_fkey,
  ADD CONSTRAINT journal_entries_leg_id_fkey
    FOREIGN KEY (leg_id) REFERENCES legs(id) ON DELETE SET NULL;
