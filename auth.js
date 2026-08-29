/* auth.js - Supabase Auth logic */

const SUPABASE_URL = 'https://rzjprvkieduqbemaidzp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6anBydmtpZWR1cWJlbWFpZHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDYxNzgsImV4cCI6MjEwMzU4MjE3OH0.Kb5B0y7bBKFA9hsrOJazZl5X1h6UqX522VJbie6eOxQ';

let supabase = null;
let currentUser = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase SDK not loaded yet.');
    return;
  }
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') return;

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI(event, session);
  });
}

// Auth modal - runs immediately, no dependencies
function initAuthModal() {
  const modal = document.getElementById('auth-modal');
  const enterBtn = document.getElementById('auth-enter');
  const signupBtn = document.getElementById('nav-join');
  const loginBtn = document.getElementById('nav-login');

  function openModal(tab = 'signup') {
    if (!modal) return;
    modal.style.display = 'flex';
    switchAuthTab(tab || 'signup');
    const email = document.getElementById((tab === 'signin' ? 'signin' : 'signup') + '-email');
    if (email) setTimeout(() => email.focus(), 50);
  }

  function closeModal() {
    if (modal) modal.style.display = 'none';
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signup');
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signin');
    });
  }

  const closeBtn = document.getElementById('auth-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  window.closeAuthModal = closeModal;
  window.openAuthModal = openModal;
}

// Auth state listener
function updateAuthUI(event, session) {
  const loginLink = document.getElementById('nav-login');
  const joinLink = document.getElementById('nav-join');
  const portalLink = document.getElementById('nav-portal');
  const myAccountLink = document.getElementById('nav-account');

  if (session) {
    if (loginLink) loginLink.style.display = 'none';
    if (joinLink) joinLink.style.display = 'none';
    if (portalLink) portalLink.style.display = 'inline-block';
    if (myAccountLink) myAccountLink.style.display = 'inline-block';
  } else {
    if (loginLink) loginLink.style.display = 'inline-block';
    if (joinLink) joinLink.style.display = 'inline-block';
    if (portalLink) portalLink.style.display = 'none';
    if (myAccountLink) myAccountLink.style.display = 'none';
  }
}

// Sign Up
async function handleSignUp(e) {
  e.preventDefault();
  const errorEl = document.getElementById('auth-error');
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!email || !password) {
    showAuthError('Please fill in all fields.');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }

  if (!supabase) {
    showAuthError('Authentication system not configured.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailConfirm: false
      }
    });

    if (error) {
      showAuthError(error.message);
      return;
    }

    // Insert profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          membership_tier: 'free',
          age_verified: true
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    showAuthError('Account created! You can now sign in.', false);
    switchAuthTab('signin');

  } catch (err) {
    showAuthError('An unexpected error occurred. Please try again.');
    console.error(err);
  }
}

// Sign In
async function handleSignIn(e) {
  e.preventDefault();
  const errorEl = document.getElementById('auth-error');
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    showAuthError('Please fill in all fields.');
    return;
  }

  if (!supabase) {
    showAuthError('Authentication system not configured.');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      showAuthError(error.message);
      return;
    }

    if (data.user) {
      enterPortal();
    }

  } catch (err) {
    showAuthError('An unexpected error occurred. Please try again.');
    console.error(err);
  }
}

// Logout
async function handleLogout() {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
    exitPortal();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

function showAuthError(message, isError = true) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.toggle('visible', true);
    if (!isError) {
      errorEl.style.background = 'rgba(201,169,97,0.15)';
      errorEl.style.borderColor = 'var(--portal-gold)';
    }
  }
}

function switchAuthTab(tab) {
  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');
  const errorEl = document.getElementById('auth-error');

  if (errorEl) {
    errorEl.classList.remove('visible');
    errorEl.style.background = '';
    errorEl.style.borderColor = '';
  }

  if (tab === 'signup') {
    if (signupForm) signupForm.style.display = 'block';
    if (signinForm) signinForm.style.display = 'none';
  } else {
    if (signupForm) signupForm.style.display = 'none';
    if (signinForm) signinForm.style.display = 'block';
  }
}

function enterPortal() {
  document.body.classList.add('portal-active');
  const portal = document.getElementById('portal-section');
  if (portal) portal.classList.add('active');
  closeAuthModal && closeAuthModal();
  loadChatHistory();
  loadUserProfile();
}

function exitPortal() {
  document.body.classList.remove('portal-active');
  const portal = document.getElementById('portal-section');
  if (portal) portal.classList.remove('active');
  if (window.openAuthModal) window.openAuthModal('signin');
}

async function loadUserProfile() {
  if (!currentUser || !supabase) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('membership_tier, email')
    .eq('id', currentUser.id)
    .single();

  if (data && !error) {
    const tierEl = document.getElementById('user-tier');
    const emailEl = document.getElementById('user-email');
    if (tierEl) tierEl.textContent = data.membership_tier || 'free';
    if (emailEl) emailEl.textContent = data.email || currentUser.email;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAuthModal();
  initSupabase();

  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');

  if (signupForm) signupForm.addEventListener('submit', handleSignUp);
  if (signinForm) signinForm.addEventListener('submit', handleSignIn);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});
