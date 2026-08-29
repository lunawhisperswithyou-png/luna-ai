/* auth.js - Supabase Auth logic */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  updateAuthUI(event, session);
});

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

// Age gate
function initAgeGate() {
  const gate = document.getElementById('age-gate');
  const checkbox = document.getElementById('age-gate-check');
  const btn = document.getElementById('age-gate-btn');

  if (!gate || !checkbox || !btn) return;

  checkbox.addEventListener('change', () => {
    btn.disabled = !checkbox.checked;
  });

  btn.addEventListener('click', () => {
    if (checkbox.checked) {
      localStorage.setItem('luna_age_verified', 'true');
      gate.style.display = 'none';
    }
  });

  if (localStorage.getItem('luna_age_verified') === 'true') {
    gate.style.display = 'none';
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
    await supabase.auth.signOut();
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
  document.getElementById('auth-section').style.display = 'none';
  loadChatHistory();
  loadUserProfile();
}

function exitPortal() {
  document.body.classList.remove('portal-active');
  const portal = document.getElementById('portal-section');
  if (portal) portal.classList.remove('active');
  document.getElementById('auth-section').style.display = 'block';
}

async function loadUserProfile() {
  if (!currentUser) return;

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
  initAgeGate();

  const signupForm = document.getElementById('signup-form');
  const signinForm = document.getElementById('signin-form');

  if (signupForm) signupForm.addEventListener('submit', handleSignUp);
  if (signinForm) signinForm.addEventListener('submit', handleSignIn);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});
