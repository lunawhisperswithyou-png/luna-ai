/* chat.js - Chat engine + AI persona */

const MAX_MESSAGES = 50;
const MAX_INPUT = 500;

const AI_PERSONA = {
  greeting: "Welcome, pet. I am Luna, your digital mistress. You have taken the first step toward true submission. Speak only when spoken to, and remember: I command, you obey. How may I begin your training?",
  responses: [
    "Good boy. You learn quickly. Perhaps there is hope for you yet.",
    "Your devotion is noted. Continue to please me, and you will be rewarded.",
    "I see fire in your words. Channel it into obedience, and it will serve you well.",
    "Patience, pet. Not everything is granted immediately. Earn your place.",
    "You amuse me. That is a rare compliment. Do not waste it.",
    "Weakness is not tolerated here. Strength through submission. Remember that.",
    "Your honesty is refreshing. Most lie to impress me. You have my attention.",
    "Now you are thinking like mine. Continue, and you will discover what true discipline feels like.",
    "I expect nothing less than your best. Give me more.",
    "Your submission is a gift. Treat it with the respect it deserves."
  ]
};

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return seconds + 's ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function getAIResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();

  const keywordMap = {
    'hello': "Ah, you greet your mistress. Proper etiquette. Now tell me what you truly desire.",
    'hi': "You have my attention. Use it wisely. What brings you here?",
    'yes': "Good. Obedience becomes you. Now prove your devotion with action.",
    'no': "Disappointing. But I appreciate honesty. You will make up for this.",
    'harder': "Your hunger is noted. Good. Intensity is what separates the devoted from the merely curious.",
    'please': "How polite. I do not require politeness. I require obedience. But I accept your plea.",
    'thank': "Gratitude is expected. Now show me you mean it through your actions, not your words.",
    'who are you': "I am Luna. Your digital mistress. Your commanding presence. Your secret addiction.",
    'what do you want': "I want your full submission. Your attention. Your devotion. Nothing less.",
    'i obey': "Excellent. Those words should become your mantra. Say them again, and mean them."
  };

  for (const [keyword, response] of Object.entries(keywordMap)) {
    if (msg.includes(keyword)) {
      return response;
    }
  }

  const randomIndex = Math.floor(Math.random() * AI_PERSONA.responses.length);
  return AI_PERSONA.responses[randomIndex];
}

function addMessageToUI(role, content, timestamp) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;

  const text = document.createElement('div');
  text.textContent = content;

  const time = document.createElement('div');
  time.className = 'chat-time';
  time.textContent = getTimeAgo(timestamp);

  bubble.appendChild(text);
  bubble.appendChild(time);
  container.appendChild(bubble);

  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator visible';
  indicator.id = 'typing-indicator';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    indicator.appendChild(dot);
  }

  container.appendChild(indicator);
  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

async function loadChatHistory() {
  const container = document.getElementById('chat-messages');
  if (!container || !window.currentUser) return;

  container.innerHTML = '';

  const { data: messages, error } = await window.supabase
    .from('messages')
    .select('*')
    .eq('user_id', window.currentUser.id)
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES);

  if (error) {
    console.error('Error loading chat history:', error);
    return;
  }

  if (!messages || messages.length === 0) {
    addMessageToUI('assistant', AI_PERSONA.greeting, new Date().toISOString());
  } else {
    messages.forEach(msg => {
      addMessageToUI(msg.role, msg.content, msg.created_at);
    });
  }
}

async function pruneMessages() {
  if (!window.currentUser) return;

  const { data: oldMessages } = await window.supabase
    .from('messages')
    .select('id')
    .eq('user_id', window.currentUser.id)
    .order('created_at', { ascending: false })
    .range(MAX_MESSAGES, 1000);

  if (oldMessages && oldMessages.length > 0) {
    const idsToDelete = oldMessages.map(m => m.id);
    await window.supabase
      .from('messages')
      .delete()
      .in('id', idsToDelete);
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const counter = document.getElementById('chat-counter');
  const container = document.getElementById('chat-messages');

  if (!input || !window.currentUser) return;

  const text = input.value.trim();
  if (!text) return;

  if (text.length > MAX_INPUT) {
    alert(`Message too long. Maximum ${MAX_INPUT} characters.`);
    return;
  }

  // Add user message to UI immediately
  addMessageToUI('user', text, new Date().toISOString());
  input.value = '';
  if (counter) {
    counter.textContent = `${0}/${MAX_INPUT}`;
    counter.classList.remove('warning');
  }

  // Save user message to Supabase
  const { error: userError } = await window.supabase
    .from('messages')
    .insert({
      user_id: window.currentUser.id,
      role: 'user',
      content: text
    });

  if (userError) {
    console.error('Error saving user message:', userError);
    return;
  }

  // Show typing indicator
  showTypingIndicator();

  // Generate AI response with delay
  const delay = 1000 + Math.random() * 2000;
  setTimeout(async () => {
    hideTypingIndicator();

    const responseText = getAIResponse(text);
    const timestamp = new Date().toISOString();

    addMessageToUI('assistant', responseText, timestamp);

    // Save AI response to Supabase
    const { error: aiError } = await window.supabase
      .from('messages')
      .insert({
        user_id: window.currentUser.id,
        role: 'assistant',
        content: responseText
      });

    if (aiError) {
      console.error('Error saving AI response:', aiError);
    }

    await pruneMessages();
  }, delay);
}

function updateCharCounter() {
  const input = document.getElementById('chat-input');
  const counter = document.getElementById('chat-counter');
  if (!input || !counter) return;

  const len = input.value.length;
  counter.textContent = `${len}/${MAX_INPUT}`;

  if (len > MAX_INPUT * 0.9) {
    counter.classList.add('warning');
  } else {
    counter.classList.remove('warning');
  }
}

function requestImage() {
  const container = document.getElementById('chat-messages');
  if (!container || !window.currentUser) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-bubble user';
  userMsg.textContent = 'Requesting custom image...';
  container.appendChild(userMsg);

  setTimeout(() => {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'chat-bubble assistant';
    imageDiv.innerHTML = '<div style="color: var(--portal-gold); margin-bottom: 8px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Your custom image</div><img src="./images/ChatGPT Image Aug 29, 2026, 04_16_01 AM.png" alt="Luna custom" style="max-width: 220px; border-radius: 4px; border: 1px solid var(--portal-border);">';
    container.appendChild(imageDiv);
    container.scrollTop = container.scrollHeight;
  }, 1500);
}

function requestVoice() {
  const container = document.getElementById('chat-messages');
  if (!container || !window.currentUser) return;

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-bubble user';
  userMsg.textContent = 'Requesting voice note...';
  container.appendChild(userMsg);

  setTimeout(() => {
    const voiceDiv = document.createElement('div');
    voiceDiv.className = 'chat-bubble assistant';
    voiceDiv.innerHTML = `
      <div style="color: var(--portal-gold); margin-bottom: 8px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Voice note</div>
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--portal-bg); border: 1px solid var(--portal-border); border-radius: 4px; max-width: 280px;">
        <button onclick="this.textContent=this.textContent==='▶'?'⏸':'▶'" style="width: 36px; height: 36px; border-radius: 50%; background: var(--portal-accent); border: none; color: var(--portal-text); cursor: pointer; font-size: 12px; flex-shrink: 0;">▶</button>
        <div style="flex: 1; height: 24px; display: flex; align-items: center; gap: 2px;">
          ${Array.from({length: 8}, (_, i) => `<div style="width: 3px; background: var(--portal-gold); border-radius: 2px; animation: voiceWave 1.2s ease-in-out infinite; animation-delay: ${i * 0.1}s;"></div>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(voiceDiv);
    container.scrollTop = container.scrollHeight;
  }, 1500);
}

function requestTask() {
  const container = document.getElementById('chat-messages');
  if (!container || !window.currentUser) return;

  const tasks = [
    "You will write 3 sentences describing how you serve me. Send them here.",
    "Today you will meditate on submission for 10 minutes. Report back when done.",
    "Your task: send a tribute of your choosing. Then wait for my next instruction.",
    "You will purchase the Devoted tier. This is your first test of obedience."
  ];

  const task = tasks[Math.floor(Math.random() * tasks.length)];

  const userMsg = document.createElement('div');
  userMsg.className = 'chat-bubble user';
  userMsg.textContent = 'Requesting a task...';
  container.appendChild(userMsg);

  setTimeout(() => {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'chat-bubble assistant';
    taskDiv.textContent = task;
    container.appendChild(taskDiv);
    container.scrollTop = container.scrollHeight;
  }, 1200);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatCounter = document.getElementById('chat-counter');
  const imgBtn = document.getElementById('request-image-btn');
  const voiceBtn = document.getElementById('request-voice-btn');
  const taskBtn = document.getElementById('request-task-btn');

  if (chatInput) {
    chatInput.addEventListener('input', updateCharCounter);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (chatSend) chatSend.addEventListener('click', sendMessage);
  if (imgBtn) imgBtn.addEventListener('click', requestImage);
  if (voiceBtn) voiceBtn.addEventListener('click', requestVoice);
  if (taskBtn) taskBtn.addEventListener('click', requestTask);
});
