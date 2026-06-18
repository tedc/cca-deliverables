-- ============================================================
-- CCA-F Trainer — Postgres Schema
-- Reference schema. Claude Code userà Drizzle ORM per gestire
-- migrations effettive, ma questo file documenta la struttura.
-- ============================================================

-- Estensioni utili
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS (Better Auth)
-- ============================================================

CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        VARCHAR(255) UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   VARCHAR(45),
  user_agent   TEXT
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ============================================================
-- QUESTIONS
-- ============================================================

CREATE TABLE questions (
  id             VARCHAR(20) PRIMARY KEY,
  domain         VARCHAR(50) NOT NULL,
  scenario       VARCHAR(50) NOT NULL,
  subdomain      VARCHAR(100),
  difficulty     VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source         VARCHAR(100),
  question_text  TEXT NOT NULL,
  options        JSONB NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation    TEXT NOT NULL,
  tags           JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_domain ON questions(domain);
CREATE INDEX idx_questions_scenario ON questions(scenario);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- ============================================================
-- EXAM SESSIONS
-- ============================================================

CREATE TABLE exam_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode                VARCHAR(20) NOT NULL CHECK (mode IN ('drill', 'exam', 'bruciapelo')),
  status              VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'suspended', 'completed', 'expired')),
  question_ids        JSONB NOT NULL,
  current_index       INT NOT NULL DEFAULT 0,
  answers             JSONB NOT NULL DEFAULT '{}'::JSONB,
  marked_for_review   JSONB NOT NULL DEFAULT '[]'::JSONB,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  elapsed_seconds     INT NOT NULL DEFAULT 0,
  time_limit_seconds  INT,
  filters             JSONB
);

CREATE INDEX idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX idx_exam_sessions_mode ON exam_sessions(mode);

-- ============================================================
-- QUESTION ATTEMPTS
-- ============================================================

CREATE TABLE question_attempts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id        VARCHAR(20) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id         UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  user_answer        CHAR(1) CHECK (user_answer IN ('A', 'B', 'C', 'D')),
  is_correct         BOOLEAN NOT NULL,
  time_taken_seconds INT,
  attempted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_user_id ON question_attempts(user_id);
CREATE INDEX idx_attempts_question_id ON question_attempts(question_id);
CREATE INDEX idx_attempts_session_id ON question_attempts(session_id);
CREATE INDEX idx_attempts_attempted_at ON question_attempts(attempted_at);

-- ============================================================
-- EXAM HISTORY (esami completati)
-- ============================================================

CREATE TABLE exam_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id          UUID UNIQUE REFERENCES exam_sessions(id) ON DELETE CASCADE,
  mode                VARCHAR(20) NOT NULL,
  total_questions     INT NOT NULL,
  correct_answers     INT NOT NULL,
  score               INT NOT NULL,
  score_breakdown     JSONB NOT NULL,
  duration_seconds    INT NOT NULL,
  completed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user_id ON exam_history(user_id);
CREATE INDEX idx_history_completed_at ON exam_history(completed_at);

-- ============================================================
-- COMMENTI / NOTE
-- ============================================================

COMMENT ON TABLE users IS 'Single-user app: una sola riga normalmente';
COMMENT ON TABLE questions IS 'Pool di 130 domande, popolato al primo deploy via seed';
COMMENT ON TABLE exam_sessions IS 'Sessioni attive di esame/drill/bruciapelo. Status suspended = sospesa, completed = terminata';
COMMENT ON TABLE question_attempts IS 'Ogni singolo tentativo di risposta, per analytics e tracking';
COMMENT ON TABLE exam_history IS 'Esami completati (mode=exam principalmente), con score breakdown per dominio';

COMMENT ON COLUMN questions.options IS 'JSONB con struttura {"A": "...", "B": "...", "C": "...", "D": "..."}';
COMMENT ON COLUMN questions.tags IS 'JSONB array di stringhe (es. ["hub-and-spoke", "error-propagation"])';
COMMENT ON COLUMN exam_sessions.question_ids IS 'JSONB array di question IDs nellordine dellesame';
COMMENT ON COLUMN exam_sessions.answers IS 'JSONB object: {"Q001": "A", "Q005": "C", ...}';
COMMENT ON COLUMN exam_sessions.marked_for_review IS 'JSONB array di question IDs marcati per review';
COMMENT ON COLUMN exam_sessions.filters IS 'JSONB object con filtri applicati (per drill mode): {"domain": "...", "difficulty": "..."}';
COMMENT ON COLUMN exam_history.score IS 'Scaled 100-1000, passing 720';
COMMENT ON COLUMN exam_history.score_breakdown IS 'JSONB: {"Agentic Architecture": {"correct": 8, "total": 16}, ...}';
