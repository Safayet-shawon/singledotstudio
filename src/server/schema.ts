// Postgres schema for the management system. Applied automatically (idempotent) the first time the database is used.
export const SCHEMA_VERSION = 4;

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_meta (id int PRIMARY KEY, version int NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    phone text,
    employee_code text UNIQUE,
    position text,
    department text,
    joined_on date,
    manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','inactive')),
    is_owner boolean NOT NULL DEFAULT false,
    password_hash text,
    perms text[] NOT NULL DEFAULT '{}',
    photo_media uuid,
    invite_hash text,
    invite_expires timestamptz,
    last_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_one_owner ON users (is_owner) WHERE is_owner`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    ua text
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,

  `CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    company text,
    phone text,
    email text,
    address text,
    notes text,
    status text NOT NULL DEFAULT 'active',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS client_access (
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (client_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    type text,
    location text,
    description text,
    start_on date,
    due_on date,
    status text NOT NULL DEFAULT 'planning',
    budget numeric(14,2),
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS project_members (
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    PRIMARY KEY (project_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    due_on date,
    done boolean NOT NULL DEFAULT false
  )`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
    due_on date,
    status text NOT NULL DEFAULT 'assigned',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id)`,
  `CREATE TABLE IF NOT EXISTS task_assignees (
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS task_events (
    id bigserial PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    kind text NOT NULL,
    from_status text,
    to_status text,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL,
    ref_id uuid,
    name text NOT NULL,
    mime text,
    size int,
    blob_path text NOT NULL,
    uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS files_ref ON files(kind, ref_id)`,

  `CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number text NOT NULL UNIQUE,
    type text NOT NULL,
    client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
    project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft',
    current_version int NOT NULL DEFAULT 1,
    total numeric(14,2) NOT NULL DEFAULT 0,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    sent_at timestamptz,
    sent_via text,
    issued boolean NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version int NOT NULL,
    data jsonb NOT NULL,
    total numeric(14,2) NOT NULL,
    change_note text,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS document_counters (
    doc_type text NOT NULL,
    yr int NOT NULL,
    n int NOT NULL DEFAULT 0,
    PRIMARY KEY (doc_type, yr)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    method text,
    reference text,
    paid_on date NOT NULL DEFAULT current_date,
    recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
    title text NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount >= 0),
    spent_on date NOT NULL DEFAULT current_date,
    status text NOT NULL DEFAULT 'pending',
    entered_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS salary_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month text NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount >= 0),
    note text,
    status text NOT NULL DEFAULT 'draft',
    entered_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, month)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, read, created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    actor_id uuid,
    actor_name text,
    action text NOT NULL,
    entity text,
    entity_id text,
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE OR REPLACE FUNCTION audit_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS audit_no_change ON audit_log`,
  `CREATE TRIGGER audit_no_change BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_immutable()`,

  `CREATE TABLE IF NOT EXISTS media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    alt text,
    caption text,
    mime text NOT NULL,
    size int NOT NULL,
    blob_path text NOT NULL,
    uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cms (
    key text PRIMARY KEY,
    draft jsonb NOT NULL DEFAULT '{}'::jsonb,
    published jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS cms_versions (
    id bigserial PRIMARY KEY,
    snapshot jsonb NOT NULL,
    published_by uuid REFERENCES users(id) ON DELETE SET NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key text PRIMARY KEY,
    fails int NOT NULL DEFAULT 0,
    window_start timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL
  )`,
];
