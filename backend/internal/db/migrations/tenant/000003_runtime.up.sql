CREATE TABLE plan_integrity (
                                id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                plan_id         UUID        NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
                                mc_version      mc_version  NOT NULL,
                                manifest_hash   TEXT        NOT NULL,
                                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                UNIQUE (plan_id, mc_version)
);

CREATE INDEX idx_integrity_plan ON plan_integrity (plan_id);

CREATE TYPE runtime_event_type AS ENUM (
    'debugger_detected',
    'jvmti_dump_attempt',
    'integrity_failure',
    'profiler_detected',
    'hwid_mismatch',
    'launcher_check_failed',
    'jvm_agent_detected'
);

CREATE TABLE runtime_events (
                                id          BIGSERIAL           PRIMARY KEY,
                                session_id  UUID                REFERENCES sessions(id) ON DELETE SET NULL,
                                user_id     UUID                REFERENCES users(id)    ON DELETE SET NULL,
                                event_type  runtime_event_type  NOT NULL,
                                severity    audit_level         NOT NULL DEFAULT 'warn',
                                payload     JSONB               NOT NULL DEFAULT '{}',
                                ip_address  INET,
                                created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_re_session ON runtime_events (session_id);
CREATE INDEX idx_re_user    ON runtime_events (user_id);
CREATE INDEX idx_re_type    ON runtime_events (event_type);
CREATE INDEX idx_re_created ON runtime_events (created_at DESC);