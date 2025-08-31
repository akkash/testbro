-- Migration for Conversational AI functionality
-- Add table for storing conversation messages

CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);

-- Add conversation sessions table for tracking active conversations
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    context JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    last_message_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME zone DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME zone DEFAULT NOW()
);

-- Add indexes for conversation sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message ON conversation_sessions(last_message_at);

-- Update conversation_messages to reference conversation_sessions
ALTER TABLE conversation_messages 
ADD CONSTRAINT fk_conversation_messages_session 
FOREIGN KEY (conversation_id) REFERENCES conversation_sessions(id) ON DELETE CASCADE;