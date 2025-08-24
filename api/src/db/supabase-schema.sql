-- Tab Memory Supabase Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable Row Level Security (RLS) for all tables
-- This ensures user data isolation

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL,
    screenshot_url TEXT,
    mode VARCHAR(10) NOT NULL DEFAULT 'loose' CHECK (mode IN ('strict', 'loose')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Sessions are private to each user
CREATE POLICY "Users can manage own sessions" ON sessions
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Tabs table
CREATE TABLE tabs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(1000) NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, order_index)
);

-- Enable RLS on tabs table
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;

-- Tabs inherit permissions from sessions
CREATE POLICY "Users can manage tabs in own sessions" ON tabs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = tabs.session_id 
            AND sessions.user_id::text = auth.uid()::text
        )
    );

-- Events table (raw tab events)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_id INTEGER NOT NULL,
    tab_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('open', 'update', 'activate', 'close')),
    title VARCHAR(1000) NOT NULL,
    url TEXT NOT NULL,
    ts TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events are private to each user
CREATE POLICY "Users can manage own events" ON events
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Vectors table (for embeddings - Phase 3+)
CREATE TABLE vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('session', 'tab', 'query')),
    owner_id UUID NOT NULL,
    embedding vector(384), -- Default dimension for Cohere embeddings
    dim INTEGER NOT NULL DEFAULT 384,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on vectors table
ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;

-- Vectors inherit permissions from their owners
CREATE POLICY "Users can manage vectors for own content" ON vectors
    FOR ALL USING (
        CASE 
            WHEN owner_type = 'session' THEN
                EXISTS (
                    SELECT 1 FROM sessions 
                    WHERE sessions.id = vectors.owner_id 
                    AND sessions.user_id::text = auth.uid()::text
                )
            WHEN owner_type = 'tab' THEN
                EXISTS (
                    SELECT 1 FROM tabs 
                    JOIN sessions ON sessions.id = tabs.session_id
                    WHERE tabs.id = vectors.owner_id 
                    AND sessions.user_id::text = auth.uid()::text
                )
            ELSE auth.uid()::text = owner_id::text -- For query type
        END
    );

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_last_active ON sessions(user_id, last_active_at DESC);
CREATE INDEX idx_tabs_session_id ON tabs(session_id);
CREATE INDEX idx_tabs_url ON tabs(url);
CREATE INDEX idx_events_user_ts ON events(user_id, ts DESC);
CREATE INDEX idx_events_tab ON events(tab_id, ts DESC);
CREATE INDEX idx_events_user_window ON events(user_id, window_id, ts DESC);
CREATE INDEX idx_vectors_owner ON vectors(owner_type, owner_id);

-- Vector similarity index (requires pgvector extension)
CREATE INDEX idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tabs_updated_at BEFORE UPDATE ON tabs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW session_stats AS
SELECT 
    s.id,
    s.user_id,
    s.title,
    s.summary,
    s.confidence,
    s.started_at,
    s.last_active_at,
    s.screenshot_url,
    s.mode,
    COUNT(t.id) as tab_count,
    MIN(t.first_seen_at) as first_tab_seen,
    MAX(t.last_seen_at) as last_tab_seen
FROM sessions s
LEFT JOIN tabs t ON s.id = t.session_id
GROUP BY s.id, s.user_id, s.title, s.summary, s.confidence, 
         s.started_at, s.last_active_at, s.screenshot_url, s.mode;

-- Note: Views cannot have RLS enabled directly
-- RLS is inherited from the underlying tables (sessions and tabs)

-- Function to clean up old events (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_events(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
