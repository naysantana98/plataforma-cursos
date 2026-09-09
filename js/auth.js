const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

if (loginForm) loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.textContent = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  location.href = "aluno.html";
});

if (registerForm) registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.textContent = "Criando conta...";

  const { data, error } = await supabaseClient.auth.signUp({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
    options: {
      data: {
        full_name: document.getElementById("name").value
      },
      emailRedirectTo: "https://naysantana98.github.io/plataforma-cursos/login.html"
    }
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = data.session
    ? "Conta criada."
    : "Conta criada. Confira seu e-mail para confirmar o cadastro.";
});
