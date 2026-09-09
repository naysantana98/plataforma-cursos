const adminSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (selector) => document.querySelector(selector);
const message = $("#message");

async function init() {
  const { data: { user }, error: userError } = await adminSb.auth.getUser();

  if (userError || !user) {
    location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } = await adminSb
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    document.body.innerHTML = `
      <main class="auth-page">
        <div class="auth-box">
          <h1>Acesso negado</h1>
          <p>Esta área é exclusiva para administradores.</p>
        </div>
      </main>
    `;
    return;
  }

  await load();
}

async function load() {
  const coursesResult = await adminSb
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const studentsResult = await adminSb
    .from("profiles")
    .select("id, full_name, role, active, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const enrollmentsResult = await adminSb
    .from("enrollments")
    .select("id, status");

  const stats = $("#stats");

  if (stats) {
    stats.innerHTML = `
      <article>
        <h3>${coursesResult.data?.length || 0}</h3>
        <p>Cursos</p>
      </article>

      <article>
        <h3>${studentsResult.data?.length || 0}</h3>
        <p>Alunos</p>
      </article>

      <article>
        <h3>${enrollmentsResult.data?.filter(x => x.status === "active").length || 0}</h3>
        <p>Matrículas ativas</p>
      </article>
    `;
  }

  const courses = $("#courses");

  if (courses) {
    courses.innerHTML = (coursesResult.data || []).map(course => `
      <div class="list-row">
        <div>
          <b>${escapeHtml(course.title)}</b>
          <small>R$ ${Number(course.price).toFixed(2)}</small>
        </div>

        <a
          class="btn btn-outline"
          href="admin-curso.html?id=${course.id}"
        >
          Gerenciar
        </a>
      </div>
    `).join("");
  }

  const students = $("#students");

  if (students) {
    students.innerHTML = (studentsResult.data || []).map(student => `
      <div class="list-row">
        <div>
          <b>${escapeHtml(student.full_name || "Sem nome")}</b>
          <small>${escapeHtml(student.id)}</small>
        </div>

        <span class="status">
          ${student.active ? "Ativo" : "Inativo"}
        </span>
      </div>
    `).join("");
  }
}

const courseForm = $("#courseForm");

if (courseForm) {
  courseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.textContent = "Cadastrando curso...";

    const { error } = await adminSb
      .from("courses")
      .insert({
        title: $("#title").value,
        slug: $("#slug").value,
        price: Number($("#price").value || 0),
        description: $("#description").value
      });

    if (error) {
      message.textContent = error.message;
      return;
    }

    message.textContent = "Curso cadastrado com sucesso!";

    courseForm.reset();

    await load();
  });
}

const logoutButton = $("#logout");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await adminSb.auth.signOut();
    location.href = "index.html";
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

init();
