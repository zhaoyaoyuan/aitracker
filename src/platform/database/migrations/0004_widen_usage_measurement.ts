/**
 * Migration 0004: widen the `measurement` CHECK to accept `'reported'`.
 *
 * The Cursor usage reader now emits tool-authored cumulative context figures
 * (`promptTokenBreakdown.totalUsedTokens`, one per composer) labelled
 * `measurement: "reported"` — real, but coarse: a context-side total rather
 * than per-message billing. Persisting that provenance honestly requires the
 * live aggregate table to accept the new value.
 *
 * The only surviving `measurement` column after migration 0002 is
 * `usage_aggregate_buckets.measurement` (the event-level usage tables are
 * legacy schema that 0002 removed). SQLite cannot alter a CHECK constraint
 * in place, so the table is rebuilt with the widened CHECK, preserving rows.
 *
 * The rebuild moves `usage_aggregate_bucket_tools` aside first: the
 * migration runner executes inside a transaction where `PRAGMA
 * foreign_keys` cannot be toggled, and dropping a parent table with foreign
 * keys enabled fires the child's `ON DELETE CASCADE` through an implicit
 * DELETE. The temporary child therefore references the temporary parent
 * (`usage_aggregate_buckets_new`), so the old parent's drop cannot cascade
 * into it; renaming the parent back rewrites the child's foreign key to the
 * final name (SQLite FK rewrite on rename), leaving the finished schema
 * byte-identical to 0001 apart from the widened CHECK. Data moves with
 * plain `INSERT ... SELECT` between tables whose column order matches 0001,
 * and foreign-key enforcement stays on throughout.
 */
export const WIDEN_USAGE_MEASUREMENT_SQL = `-- AITracker local storage database — measurement 'reported' (Cursor composer figures).

CREATE TABLE usage_aggregate_buckets_new (
  snapshot_id TEXT NOT NULL REFERENCES usage_aggregate_snapshots(snapshot_id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  latest_at_ms INTEGER NOT NULL CHECK(latest_at_ms >= 0),
  source_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  project_ref_hash TEXT,
  project_label TEXT NOT NULL,
  project_kind TEXT NOT NULL DEFAULT 'unknown'
    CHECK(project_kind IN ('workspace','quick-conversation','unknown')),
  measurement TEXT NOT NULL CHECK(measurement IN ('observed','estimated','reported')),
  event_count INTEGER NOT NULL CHECK(event_count > 0),
  input_tokens INTEGER NOT NULL CHECK(input_tokens >= 0),
  cached_input_tokens INTEGER NOT NULL CHECK(cached_input_tokens >= 0),
  cache_creation_input_tokens INTEGER NOT NULL CHECK(cache_creation_input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK(output_tokens >= 0),
  reasoning_output_tokens INTEGER NOT NULL CHECK(reasoning_output_tokens >= 0),
  total_tokens INTEGER NOT NULL CHECK(total_tokens >= 0),
  text_responses INTEGER NOT NULL CHECK(text_responses >= 0),
  tool_calls INTEGER NOT NULL CHECK(tool_calls >= 0),
  skill_calls INTEGER NOT NULL CHECK(skill_calls >= 0),
  tool_output_calls INTEGER NOT NULL CHECK(tool_output_calls >= 0),
  evidence_text_responses INTEGER NOT NULL CHECK(evidence_text_responses IN (0,1)),
  evidence_tool_calls INTEGER NOT NULL CHECK(evidence_tool_calls IN (0,1)),
  evidence_skill_calls INTEGER NOT NULL CHECK(evidence_skill_calls IN (0,1)),
  evidence_tool_output_calls INTEGER NOT NULL CHECK(evidence_tool_output_calls IN (0,1)),
  evidence_reasoning_tokens INTEGER NOT NULL CHECK(evidence_reasoning_tokens IN (0,1)),
  evidence_system_prompt_tokens INTEGER NOT NULL CHECK(evidence_system_prompt_tokens IN (0,1)),
  PRIMARY KEY(snapshot_id, bucket_id)
) STRICT;

INSERT INTO usage_aggregate_buckets_new SELECT * FROM usage_aggregate_buckets;

CREATE TABLE usage_aggregate_bucket_tools_new (
  snapshot_id TEXT NOT NULL,
  bucket_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  calls INTEGER NOT NULL CHECK(calls > 0),
  PRIMARY KEY(snapshot_id, bucket_id, name, category),
  FOREIGN KEY(snapshot_id, bucket_id)
    REFERENCES usage_aggregate_buckets_new(snapshot_id, bucket_id) ON DELETE CASCADE
) STRICT;
INSERT INTO usage_aggregate_bucket_tools_new SELECT * FROM usage_aggregate_bucket_tools;

DROP TABLE usage_aggregate_bucket_tools;
DROP TABLE usage_aggregate_buckets;
ALTER TABLE usage_aggregate_buckets_new RENAME TO usage_aggregate_buckets;

CREATE INDEX idx_usage_aggregate_buckets_date
  ON usage_aggregate_buckets(snapshot_id, date_key);
CREATE INDEX idx_usage_aggregate_buckets_source
  ON usage_aggregate_buckets(snapshot_id, source_id, date_key);
CREATE INDEX idx_usage_aggregate_buckets_model
  ON usage_aggregate_buckets(snapshot_id, model_id, date_key);
CREATE INDEX idx_usage_aggregate_buckets_project
  ON usage_aggregate_buckets(snapshot_id, project_ref_hash, date_key);

ALTER TABLE usage_aggregate_bucket_tools_new RENAME TO usage_aggregate_bucket_tools;
`;
