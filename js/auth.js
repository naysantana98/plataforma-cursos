const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

/* =====================================================
   CURSO / REDIRECIONAMENTO
===================================================== */

const params =
  new URLSearchParams(window.location.search);

const courseId =
  params.get("course_id");


/* =====================================
   LINK LOGIN → CADASTRO
===================================== */

const registerLink =
  document.getElementById("registerLink");

if (registerLink && courseId) {

  registerLink.href =
    `cadastro.html?course_id=${encodeURIComponent(courseId)}`;

}


/* =====================================
   LINK CADASTRO → LOGIN
===================================== */

const loginLink =
  document.getElementById("loginLink");

if (loginLink && courseId) {

  loginLink.href =
    `login.html?course_id=${encodeURIComponent(courseId)}`;

}

/* =====================================================
   LOGIN
===================================================== */

if (loginForm) {

  loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.textContent = "Entrando...";


    /* =========================
       FAZER LOGIN
    ========================= */

    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({

      email: document.getElementById("email").value,
      password: document.getElementById("password").value

    });


    if (error) {

      message.textContent = error.message;

      return;

    }


    const user = data.user;


    if (!user) {

      message.textContent =
        "Não foi possível identificar o usuário.";

      return;

    }


    /* =========================
       BUSCAR PERFIL
    ========================= */

    message.textContent =
      "Carregando seu perfil...";


    const {
      data: profile,
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();


    if (profileError) {

      console.error(
        "Erro ao carregar perfil:",
        profileError
      );

      message.textContent =
        "Não foi possível carregar seu perfil.";

      return;

    }


    if (!profile) {

      message.textContent =
        "Perfil do usuário não encontrado.";

      return;

    }


    /* =========================
       VERIFICAR SE ESTÁ ATIVO
    ========================= */

    if (profile.active === false) {

      await supabaseClient.auth.signOut();

      message.textContent =
        "Seu acesso está desativado.";

      return;

    }


    /* =========================
       REDIRECIONAMENTO
    ========================= */

    if (profile.role === "admin") {

      location.href = "admin.html";

      return;

    }


  if (profile.role === "student") {

  const params =
    new URLSearchParams(window.location.search);

  const next =
    params.get("next");


  if (
    next &&
    next.startsWith("checkout.html?course_id=")
  ) {

    location.href = next;

    return;

  }


  location.href = "aluno.html";

  return;

}


    /* =========================
       PERFIL DESCONHECIDO
    ========================= */

    await supabaseClient.auth.signOut();

    message.textContent =
      "Tipo de usuário não autorizado.";

  });

}


/* =====================================================
   CADASTRO
===================================================== */

if (registerForm) {

  registerForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.textContent =
      "Criando conta...";


    const {
      data,
      error
    } = await supabaseClient.auth.signUp({

      email: document.getElementById("email").value,

      password: document.getElementById("password").value,

      options: {

        data: {

          full_name:
            document.getElementById("name").value

        },

        emailRedirectTo:
  "https://systemsnfs.github.io/plataforma-cursos/login.html"

      }

    });


    if (error) {

      message.textContent =
        error.message;

      return;

    }


    message.textContent =
      data.session
        ? "Conta criada."
        : "Conta criada. Confira seu e-mail para confirmar o cadastro.";

  });

}
