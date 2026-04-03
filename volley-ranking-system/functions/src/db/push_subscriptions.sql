CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
