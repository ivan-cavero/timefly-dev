# ClickHouse Data Architecture for TimeFly

This document outlines the architecture of the TimeFly analytics database using ClickHouse. The design prioritizes scalability, performance, and flexibility to accommodate new metrics and event types without requiring schema migrations.

## 1. Core Principles

- **Single, Wide Table (Denormalization)**: We leverage a single, denormalized table (`activity_events`) to store all time-series data. This avoids costly JOIN operations, which are a performance bottleneck in ClickHouse.
- **Nested Data Structures**: To capture multiple activities within a single 10-second pulse, we use `Nested` data types.
- **Schemaless Context and Metrics with `Map`**: Both contextual information (like IDE version) and activity-specific metrics are stored in `Map(String, String)` fields. This provides maximum flexibility, allowing the extension to send new data points without any changes to the database schema.
- **Performance-Driven Schema**: We use `LowCardinality` for repetitive strings and a well-defined `PARTITION BY` and `ORDER BY` clause to ensure queries are extremely fast.

---

## 2. Main Table: `activity_events`

This is the central table of our data model. Each row represents a **10-second pulse** of developer activity.

### Schema

```sql
CREATE TABLE timefly.activity_events
(
    -- Core Identifiers (used for indexing and partitioning)
    event_id            UUID,                         -- Unique ID for this 10s pulse
    user_id             UUID,                         -- User's unique identifier
    project_id          LowCardinality(String),       -- Project identifier (e.g., Git repository name). Kept top-level for performance.
    event_time          DateTime64(3, 'UTC'),         -- Start of the 10s window (ms precision, UTC)

    -- Scalable Contextual Information
    metadata            Map(String, String),          -- Flexible key-value store for context.
                                                      -- e.g., {'ide_name': 'vscode', 'os': 'darwin', 'extension_version': '1.2.3'}

    -- Activities (The Magic!)
    activities Nested (
        name            LowCardinality(String),       -- 'Coding', 'Debugging', 'Reading', 'AI', 'Terminal'
        duration_ms     UInt32,                       -- Duration of this activity within the 10s window
        properties      Map(String, String)           -- The key to scalability!
                                                      -- Activity-specific metrics.
                                                      -- e.g., {'lines_added': '5', 'chars_typed': '120'}
                                                      -- e.g., {'ai_provider': 'copilot', 'suggestions_accepted': '2'}
    )
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, project_id, event_time);
```

### Key Fields Explained

- **`project_id` (`LowCardinality(String)`)**: This field is intentionally kept at the top level and included in the `ORDER BY` key. This is a critical performance optimization, as it allows ClickHouse to efficiently filter queries by project.
- **`metadata` (`Map(String, String)`)**: A flexible key-value map for all other context. You can add new properties like `has_git_repo` or `file_count` in the future without a schema change.
- **`activities` (`Nested`)**: Allows us to store an array of activities that occurred within the 10-second pulse.
- **`properties` (`Map(String, String)`)**: A key-value store for metrics specific to each activity.

---

## 3. Support Table: `activity_types`

This table serves as a dictionary for the types of activities we can track. It is not intended for use in analytical JOINs but rather for UI and backend logic to understand the available event types.

### Schema

```sql
CREATE TABLE timefly.activity_types
(
    name            LowCardinality(String),
    friendly_name   String,
    description     String,
    category        LowCardinality(String),  -- e.g., 'Editor', 'AI', 'System', 'Debugging'
    version         UInt64,                  -- For managing updates
    is_deleted      UInt8 DEFAULT 0          -- For soft deletes
)
ENGINE = ReplacingMergeTree(version)
PRIMARY KEY (name)
ORDER BY (name);
```

---

## 4. Structuring Data Pulses (From the Extension)

Every 30 minutes, the extension should batch and sync a series of 10-second activity pulses. Each pulse must be structured to match the `activity_events` schema.

### Example Pulse Payload (Illustrative JSON)

```json
{
  "event_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "user_id": "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
  "project_id": "timefly-extension",
  "event_time": "2024-07-04T10:00:10.000Z",
  "metadata": {
    "extension_version": "1.2.3",
    "ide_name": "vscode",
    "os_platform": "win32",
    "has_git_repo": "true"
  },
  "activities": [
    {
      "name": "Coding",
      "duration_ms": 9000,
      "properties": {
        "lines_added": "15",
        "lines_deleted": "3",
        "chars_typed": "310",
        "language": "typescript"
      }
    },
    {
      "name": "AI",
      "duration_ms": 1000,
      "properties": {
        "provider": "copilot",
        "suggestions_accepted": "1"
      }
    }
  ]
}
```
This payload would then be transformed into a single `INSERT` statement by the backend.

---

## 5. Querying Best Practices

- **Always use `ARRAY JOIN`**: To query data within the `activities` nested structure, use `ARRAY JOIN activities`.
- **Filter Before Aggregating**: Use `WHERE` clauses on `user_id`, `project_id`, and `event_time` to leverage the `ORDER BY` key and partitions.
- **Use `mapExists`**: Before accessing a key in the `metadata` or `properties` map, use `mapExists(map_name, 'my_key')` to avoid errors.
- **Cast Map Values**: Remember that all values in the maps are strings. You must cast them to the correct type for calculations (e.g., `toInt64(properties['lines_added'])`).