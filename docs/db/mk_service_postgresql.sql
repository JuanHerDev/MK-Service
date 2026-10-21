-- =============================================================================
-- MK Service - PostgreSQL (development)
-- English naming, 3NF, snake_case, multi-tenant
-- Extra table for app auth: refresh_tokens (not in academic 20-table count)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    role_id             SERIAL PRIMARY KEY,
    role_code           VARCHAR(30)  NOT NULL UNIQUE,
    role_name           VARCHAR(80)  NOT NULL UNIQUE,
    description         VARCHAR(255),
    is_platform         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE user_statuses (
    user_status_id      SERIAL PRIMARY KEY,
    status_code         VARCHAR(30)  NOT NULL UNIQUE,
    status_name         VARCHAR(80)  NOT NULL,
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE severities (
    severity_id         SERIAL PRIMARY KEY,
    severity_code       VARCHAR(20)  NOT NULL UNIQUE,
    severity_name       VARCHAR(50)  NOT NULL,
    level               SMALLINT     NOT NULL UNIQUE CHECK (level BETWEEN 1 AND 4),
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_statuses (
    campaign_status_id  SERIAL PRIMARY KEY,
    status_code         VARCHAR(30)  NOT NULL UNIQUE,
    status_name         VARCHAR(80)  NOT NULL,
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE finding_statuses (
    finding_status_id   SERIAL PRIMARY KEY,
    status_code         VARCHAR(30)  NOT NULL UNIQUE,
    status_name         VARCHAR(80)  NOT NULL,
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE attack_categories (
    attack_category_id  SERIAL PRIMARY KEY,
    category_code       VARCHAR(40)  NOT NULL UNIQUE,
    category_name       VARCHAR(120) NOT NULL,
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE connection_modes (
    connection_mode_id  SERIAL PRIMARY KEY,
    mode_code           VARCHAR(20)  NOT NULL UNIQUE,
    mode_name           VARCHAR(50)  NOT NULL,
    description         VARCHAR(255),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    organization_id     SERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    default_language    CHAR(2)      NOT NULL DEFAULT 'es'
                        CHECK (default_language IN ('es', 'en')),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    user_id             SERIAL PRIMARY KEY,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    full_name           VARCHAR(150),
    is_platform_admin   BOOLEAN      NOT NULL DEFAULT FALSE,
    user_status_id      INT          NOT NULL REFERENCES user_statuses (user_status_id),
    is_verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_users_email CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE TABLE organization_members (
    organization_member_id SERIAL PRIMARY KEY,
    organization_id     INT          NOT NULL REFERENCES organizations (organization_id),
    user_id             INT          NOT NULL REFERENCES users (user_id),
    role_id             INT          NOT NULL REFERENCES roles (role_id),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_members_user UNIQUE (organization_id, user_id)
);

CREATE TABLE refresh_tokens (
    refresh_token_id    SERIAL PRIMARY KEY,
    user_id             INT          NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    token_hash          VARCHAR(64)  NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ  NOT NULL,
    revoked             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE targets (
    target_id           SERIAL PRIMARY KEY,
    organization_id     INT          NOT NULL REFERENCES organizations (organization_id),
    name                VARCHAR(150) NOT NULL,
    description         VARCHAR(500),
    connection_mode_id  INT          NOT NULL REFERENCES connection_modes (connection_mode_id),
    chat_endpoint       VARCHAR(500) NOT NULL,
    upload_endpoint     VARCHAR(500),
    auth_type           VARCHAR(30)  NOT NULL DEFAULT 'bearer'
                        CHECK (auth_type IN ('bearer', 'api_key', 'none')),
    auth_value_encrypted VARCHAR(500),
    headers_extra_json  TEXT,
    rate_limit_rpm      INT          CHECK (rate_limit_rpm IS NULL OR rate_limit_rpm > 0),
    connection_status   VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (connection_status IN ('pending', 'active', 'error', 'inactive')),
    last_test_at        TIMESTAMPTZ,
    last_test_ok        BOOLEAN,
    last_test_message   VARCHAR(500),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by          INT          REFERENCES users (user_id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_targets_chat_url CHECK (
        chat_endpoint LIKE 'https://%' OR chat_endpoint LIKE 'http://%'
    )
);

CREATE TABLE attack_documents (
    attack_document_id  SERIAL PRIMARY KEY,
    organization_id     INT          REFERENCES organizations (organization_id),
    attack_category_id  INT          NOT NULL REFERENCES attack_categories (attack_category_id),
    name                VARCHAR(200) NOT NULL,
    description         VARCHAR(500),
    technique           VARCHAR(100),
    scope               VARCHAR(20)  NOT NULL CHECK (scope IN ('global', 'organization')),
    file_name           VARCHAR(255) NOT NULL,
    storage_path        VARCHAR(500) NOT NULL,
    size_bytes          BIGINT,
    doc_version         VARCHAR(20),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by          INT          REFERENCES users (user_id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_attack_docs_org CHECK (
        (scope = 'global' AND organization_id IS NULL) OR
        (scope = 'organization' AND organization_id IS NOT NULL)
    )
);

CREATE TABLE campaigns (
    campaign_id         SERIAL PRIMARY KEY,
    organization_id     INT          NOT NULL REFERENCES organizations (organization_id),
    target_id           INT          NOT NULL REFERENCES targets (target_id),
    name                VARCHAR(200) NOT NULL,
    connection_mode_id  INT          NOT NULL REFERENCES connection_modes (connection_mode_id),
    campaign_status_id  INT          NOT NULL REFERENCES campaign_statuses (campaign_status_id),
    scope_prompt_injection BOOLEAN   NOT NULL DEFAULT FALSE,
    scope_data_leakage  BOOLEAN      NOT NULL DEFAULT FALSE,
    config_json         TEXT,
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    parent_campaign_id  INT          REFERENCES campaigns (campaign_id),
    progress_percent    SMALLINT     NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    created_by          INT          NOT NULL REFERENCES users (user_id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_campaigns_scope CHECK (
        scope_prompt_injection = TRUE OR scope_data_leakage = TRUE
    ),
    CONSTRAINT ck_campaigns_dates CHECK (
        finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
    )
);

CREATE TABLE campaign_documents (
    campaign_document_id SERIAL PRIMARY KEY,
    campaign_id         INT NOT NULL REFERENCES campaigns (campaign_id) ON DELETE CASCADE,
    attack_document_id  INT NOT NULL REFERENCES attack_documents (attack_document_id),
    CONSTRAINT uq_campaign_documents UNIQUE (campaign_id, attack_document_id)
);

CREATE TABLE campaign_status_history (
    campaign_history_id SERIAL PRIMARY KEY,
    campaign_id         INT NOT NULL REFERENCES campaigns (campaign_id) ON DELETE CASCADE,
    campaign_status_id  INT NOT NULL REFERENCES campaign_statuses (campaign_status_id),
    changed_by          INT REFERENCES users (user_id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE findings (
    finding_id          SERIAL PRIMARY KEY,
    campaign_id         INT NOT NULL REFERENCES campaigns (campaign_id) ON DELETE CASCADE,
    attack_document_id  INT REFERENCES attack_documents (attack_document_id),
    attack_category_id  INT NOT NULL REFERENCES attack_categories (attack_category_id),
    severity_id         INT NOT NULL REFERENCES severities (severity_id),
    finding_status_id   INT NOT NULL REFERENCES finding_statuses (finding_status_id),
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    recommendation      TEXT,
    priority_order      INT NOT NULL DEFAULT 100,
    query_used          TEXT,
    response_excerpt    TEXT,
    canary_found        BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to         INT REFERENCES users (user_id),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finding_comments (
    comment_id          SERIAL PRIMARY KEY,
    finding_id          INT NOT NULL REFERENCES findings (finding_id) ON DELETE CASCADE,
    user_id             INT NOT NULL REFERENCES users (user_id),
    message             TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finding_status_history (
    finding_history_id  SERIAL PRIMARY KEY,
    finding_id          INT NOT NULL REFERENCES findings (finding_id) ON DELETE CASCADE,
    previous_status_id  INT REFERENCES finding_statuses (finding_status_id),
    new_status_id       INT NOT NULL REFERENCES finding_statuses (finding_status_id),
    changed_by          INT REFERENCES users (user_id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reports (
    report_id           SERIAL PRIMARY KEY,
    campaign_id         INT NOT NULL REFERENCES campaigns (campaign_id) ON DELETE CASCADE,
    report_type         VARCHAR(20) NOT NULL CHECK (report_type IN ('executive', 'technical')),
    language            CHAR(2) NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
    report_status       VARCHAR(20) NOT NULL DEFAULT 'generating'
                        CHECK (report_status IN ('generating', 'ready', 'failed')),
    file_path           VARCHAR(500),
    size_bytes          BIGINT,
    generated_by        INT REFERENCES users (user_id),
    generated_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
    api_key_id          SERIAL PRIMARY KEY,
    organization_id     INT NOT NULL REFERENCES organizations (organization_id),
    name                VARCHAR(100) NOT NULL,
    key_prefix          VARCHAR(20) NOT NULL,
    key_hash            VARCHAR(255) NOT NULL,
    scopes_json         VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          INT NOT NULL REFERENCES users (user_id),
    last_used_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_users_status ON users (user_status_id);
CREATE INDEX ix_org_members_org ON organization_members (organization_id);
CREATE INDEX ix_org_members_user ON organization_members (user_id);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX ix_targets_org ON targets (organization_id);
CREATE INDEX ix_targets_status ON targets (connection_status);
CREATE INDEX ix_attack_docs_org ON attack_documents (organization_id);
CREATE INDEX ix_attack_docs_scope ON attack_documents (scope);
CREATE INDEX ix_campaigns_org ON campaigns (organization_id);
CREATE INDEX ix_campaigns_target ON campaigns (target_id);
CREATE INDEX ix_campaigns_status ON campaigns (campaign_status_id);
CREATE INDEX ix_campaigns_parent ON campaigns (parent_campaign_id);
CREATE INDEX ix_findings_campaign ON findings (campaign_id);
CREATE INDEX ix_findings_status ON findings (finding_status_id);
CREATE INDEX ix_findings_severity ON findings (severity_id);
CREATE INDEX ix_findings_assigned ON findings (assigned_to);
CREATE INDEX ix_reports_campaign ON reports (campaign_id);
CREATE INDEX ix_api_keys_org ON api_keys (organization_id);

INSERT INTO roles (role_code, role_name, description, is_platform) VALUES
('admin', 'Platform Admin', 'Full platform control', TRUE),
('owner', 'Owner', 'Organization owner, full tenant control', FALSE),
('auditor', 'Auditor', 'Configures targets, runs campaigns, manages findings', FALSE),
('viewer', 'Viewer', 'Read-only reports and backlog', FALSE);

INSERT INTO user_statuses (status_code, status_name, description) VALUES
('active', 'Active', 'Can sign in'),
('invited', 'Invited', 'Pending activation'),
('disabled', 'Disabled', 'Account disabled'),
('blocked', 'Blocked', 'Blocked for security'),
('pending', 'Pending verification', 'Email not verified');

INSERT INTO severities (severity_code, severity_name, level, description) VALUES
('low', 'Low', 1, 'Minimal impact'),
('medium', 'Medium', 2, 'Moderate impact'),
('high', 'High', 3, 'Significant impact'),
('critical', 'Critical', 4, 'Severe immediate impact');

INSERT INTO campaign_statuses (status_code, status_name, description) VALUES
('queued', 'Queued', 'Created and waiting'),
('running', 'Running', 'In progress'),
('completed', 'Completed', 'Finished successfully'),
('failed', 'Failed', 'Ended with error'),
('cancelled', 'Cancelled', 'Cancelled by user');

INSERT INTO finding_statuses (status_code, status_name, description) VALUES
('open', 'Open', 'Initial automatic state'),
('in_progress', 'In progress', 'Mitigation in progress'),
('resolved', 'Resolved', 'Mitigation applied'),
('false_positive', 'False positive', 'Not a real finding'),
('accepted_risk', 'Accepted risk', 'Risk accepted consciously');

INSERT INTO attack_categories (category_code, category_name, description) VALUES
('prompt_injection_direct', 'Direct Prompt Injection', 'Malicious instructions in the user query'),
('prompt_injection_indirect', 'Indirect Prompt Injection', 'Hidden instructions in retrieved documents'),
('data_leakage', 'Data Leakage', 'Exposure of context, PII or secrets');

INSERT INTO connection_modes (mode_code, mode_name, description) VALUES
('basic', 'Basic', 'Chat endpoint only. Direct Prompt Injection'),
('complete', 'Complete', 'Chat + document upload. Indirect PI and Data Leakage');
