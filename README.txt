LUNA AI - MEMBER PORTAL SETUP READM
=====================================

1. CREATE SUPABASE PROJECT
--------------------------
- Go to https://supabase.com and create a free project.
- Wait for project initialization to complete.

2. RUN SQL SCHEMA
-----------------
Open the Supabase SQL Editor and run the following SQL:

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  membership_tier TEXT DEFAULT 'free' NOT NULL,
  age_verified BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

3. AUTH SETTINGS
---------------
- In Supabase Dashboard, go to Authentication > Settings.
- Disable "Confirm email" to allow instant login without email verification.
  Note: This is for demo purposes only. Enable it for production.

4. SET ENVIRONMENT VARIABLES
----------------------------
In your deployment environment or local .env file:
- SUPABASE_URL = your Supabase project URL (e.g., https://xxxxx.supabase.co)
- SUPABASE_ANON_KEY = your Supabase anon/public key

In the code, replace the placeholders:
- D:/Hermes/luna-site/auth.js line 2: SUPABASE_URL
- D:/Hermes/luna-site/auth.js line 3: SUPABASE_ANON_KEY

DO NOT hardcode real keys in public repositories. Use environment variables
or a server-side proxy for production.

5. FILES TO DEPLOY
------------------
- index.html (updated with portal sections)
- portal.css
- auth.js
- chat.js
- images/ folder (all Luna images)

6. TESTING CHECKLIST
--------------------
[ ] Supabase project created and SQL schema applied
[ ] Registration creates a new user and profile row
[ ] Login works with correct credentials
[ ] Wrong password shows error
[ ] Chat loads with AI greeting if no prior messages
[ ] Keyword responses trigger correctly
[ ] AI responses persist to Supabase messages table
[ ] Chat history loads from Supabase on login
[ ] Logout clears session
[ ] Age gate blocks access until checkbox clicked
[ ] Mobile responsive at 375px width
[ ] Row Level Security prevents user A from reading user B messages

7. SWAP AI FOR REAL LLM
------------------------
To replace the rule-based AI with a real backend:
1. Create a Supabase Edge Function or external API endpoint.
2. In chat.js, replace the getAIResponse() call with a fetch() to your API.
3. Pass the conversation history and user message.
4. Return the AI-generated response text.
5. The rest of the chat flow (save to DB, UI update) remains unchanged.

Example replacement in chat.js setTimeout block:
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, history: messages })
  });
  const data = await response.json();
  const responseText = data.reply;
