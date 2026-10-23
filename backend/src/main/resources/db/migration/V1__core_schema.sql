-- Single Dot Studio core schema. Additive only: no statement here drops or rewrites existing data.

CREATE TABLE estimates (
    id                uuid PRIMARY KEY,
    reference         varchar(24)   NOT NULL,
    property_type     varchar(16)   NOT NULL,
    sqft              numeric(10,2) NOT NULL,
    bhk               integer       NOT NULL,
    size_label        varchar(24),
    package_requested varchar(16)   NOT NULL,
    tier              varchar(16)   NOT NULL,
    subtotal          numeric(14,2) NOT NULL,
    tax               numeric(14,2) NOT NULL,
    total             numeric(14,2) NOT NULL,
    range_low         numeric(14,2) NOT NULL,
    range_high        numeric(14,2) NOT NULL,
    customer_name     varchar(80)   NOT NULL,
    customer_email    varchar(120)  NOT NULL,
    customer_phone    varchar(20)   NOT NULL,
    customer_address  varchar(300)  NOT NULL DEFAULT '',
    whatsapp          boolean       NOT NULL DEFAULT false,
    fingerprint       varchar(64)   NOT NULL,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_estimates_reference UNIQUE (reference),
    CONSTRAINT ck_estimates_type CHECK (property_type IN ('apartment', 'villa', 'office', 'showroom')),
    CONSTRAINT ck_estimates_package CHECK (package_requested IN ('essential', 'premium', 'luxury', 'bestfit')),
    CONSTRAINT ck_estimates_tier CHECK (tier IN ('essential', 'premium', 'luxury')),
    CONSTRAINT ck_estimates_sqft CHECK (sqft > 0),
    CONSTRAINT ck_estimates_money CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0 AND range_low >= 0 AND range_high >= range_low)
);
CREATE INDEX ix_estimates_created ON estimates (created_at DESC);
CREATE INDEX ix_estimates_email ON estimates (lower(customer_email));
CREATE INDEX ix_estimates_fingerprint ON estimates (fingerprint, created_at DESC);

CREATE TABLE estimate_items (
    id          bigserial PRIMARY KEY,
    estimate_id uuid          NOT NULL REFERENCES estimates (id) ON DELETE CASCADE,
    kind        varchar(8)    NOT NULL,
    item_key    varchar(32)   NOT NULL,
    label       varchar(120)  NOT NULL,
    qty         integer       NOT NULL,
    area_sqft   integer,
    amount      numeric(14,2) NOT NULL,
    CONSTRAINT ck_estimate_items_kind CHECK (kind IN ('space', 'extra')),
    CONSTRAINT ck_estimate_items_qty CHECK (qty > 0),
    CONSTRAINT ck_estimate_items_amount CHECK (amount >= 0)
);
CREATE INDEX ix_estimate_items_estimate ON estimate_items (estimate_id);

CREATE TABLE consultations (
    id            uuid PRIMARY KEY,
    reference     varchar(24)   NOT NULL,
    customer_name varchar(80)   NOT NULL,
    customer_email varchar(120) NOT NULL,
    customer_phone varchar(20)  NOT NULL,
    customer_address varchar(300) NOT NULL,
    segment       varchar(10)   NOT NULL,
    service       varchar(40)   NOT NULL DEFAULT '',
    budget        varchar(60)   NOT NULL DEFAULT '',
    message       varchar(1000) NOT NULL DEFAULT '',
    fingerprint   varchar(64)   NOT NULL,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_consultations_reference UNIQUE (reference),
    CONSTRAINT ck_consultations_segment CHECK (segment IN ('home', 'office', 'showroom'))
);
CREATE INDEX ix_consultations_created ON consultations (created_at DESC);
CREATE INDEX ix_consultations_fingerprint ON consultations (fingerprint, created_at DESC);

CREATE TABLE notification_deliveries (
    id           bigserial PRIMARY KEY,
    kind         varchar(32)  NOT NULL,
    subject_type varchar(16)  NOT NULL,
    subject_id   uuid         NOT NULL,
    recipient    varchar(120) NOT NULL,
    status       varchar(10)  NOT NULL,
    attempts     integer      NOT NULL DEFAULT 0,
    last_error   varchar(200),
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_notification_status CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'SKIPPED')),
    CONSTRAINT ck_notification_subject CHECK (subject_type IN ('estimate', 'consultation'))
);
CREATE INDEX ix_notifications_retry ON notification_deliveries (status, updated_at);
CREATE INDEX ix_notifications_subject ON notification_deliveries (subject_type, subject_id);

-- Shared, database-backed request counters, so limits hold across several backend instances.
CREATE TABLE rate_limit_counters (
    bucket_key   varchar(96) NOT NULL,
    window_start bigint      NOT NULL,
    hits         integer     NOT NULL,
    PRIMARY KEY (bucket_key, window_start)
);
CREATE INDEX ix_rate_limit_window ON rate_limit_counters (window_start);

CREATE TABLE admin_users (
    id              uuid PRIMARY KEY,
    email           varchar(120) NOT NULL,
    password_hash   varchar(100) NOT NULL,
    enabled         boolean      NOT NULL DEFAULT true,
    failed_attempts integer      NOT NULL DEFAULT 0,
    locked_until    timestamptz,
    last_login_at   timestamptz,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_admin_users_email UNIQUE (email)
);
