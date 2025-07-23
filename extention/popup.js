const SUPABASE_URL = "https://zimufmoxijuskqiquelu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbXVmbW94aWp1c2txaXF1ZWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjIxMzAsImV4cCI6MjA2ODU5ODEzMH0.RNmObsqKUr2nlgBeYJY7Z0W-M1L1pqU4KAXEOEB8VSY";

let supabase;

function injectSupabase(cb) {
  if (window.supabase) return cb();
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
  script.onload = () => {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    cb();
  };
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", () => {
  injectSupabase(async () => {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const authSection = document.getElementById("authSection");
    const loggedInSection = document.getElementById("loggedInSection");
    const authForm = document.getElementById("authForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const authError = document.getElementById("authError");

    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) showLoggedIn(); else showAuth();

    authForm.onsubmit = async (e) => {
      e.preventDefault();
      authError.textContent = '';
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
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
});
