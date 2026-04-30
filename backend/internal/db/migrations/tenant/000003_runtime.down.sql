SET search_path TO {{SCHEMA}};

DROP TABLE  IF EXISTS runtime_events;
DROP TYPE   IF EXISTS runtime_event_type;
DROP TABLE  IF EXISTS plan_integrity;