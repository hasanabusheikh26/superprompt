// popup.js - Minimal Auth Only
const SUPABASE_URL = "https://zimufmoxijuskqiquelu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbXVmbW94aWp1c2txaXF1ZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjIxMzAsImV4cCI6MjA2ODU5ODEzMH0.RNmObsqKUr2nlgBeYJY7Z0W-M1L1pqU4KAXEOEB8VSY";
const supabase = window.supabase = supabase || createSupabaseClient();

document.addEventListener("DOMContentLoaded", async () => {
  const authSection = document.getElementById("authSection");
  const loggedInSection = document.getElementById("loggedInSection");
  const authForm = document.getElementById("authForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const authError = document.getElementById("authError");

  // Check current session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showLoggedIn();
  } else {
    showAuth();
  }

  authForm.onsubmit = async (e) => {
    e.preventDefault();
    authError.textContent = '';
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    // Try sign-in, else sign-up
    let { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Try sign up if not exist
      let { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) return authError.textContent = "Auth failed!";
      showLoggedIn();
    } else {
      showLoggedIn();
    }
  };

  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    showAuth();
  };

  function showAuth() {
    authSection.style.display = "block";
    loggedInSection.style.display = "none";
    chrome.storage.local.set({ superprompt_signedin: false });
  }
  function showLoggedIn() {
    authSection.style.display = "none";
    loggedInSection.style.display = "block";
    chrome.storage.local.set({ superprompt_signedin: true });
  }
});

// --- Helper for Supabase browser-only ---
function createSupabaseClient() {
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
    document.head.appendChild(script);
  }
  return supabase;
}
