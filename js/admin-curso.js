const sbA = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const courseId = new URLSearchParams(location.search).get("id");
const msgA = document.getElementById("message");

async function init() {
  const { data: { user } } = await sbA.auth.getUser();

  if (!user) {
    location.href = "login.html";
    return;
  }

  const { data: profile } = await sbA
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    location.href = "aluno.html";
    return;
  }

  await render();
}

async function render() {
  const { data: course, error: courseError } = await sbA
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    msgA.textContent = "Não foi possível carregar o curso.";
    return;
  }

  document.getElementById("course").innerHTML = `
    <span class="eyebrow">CURSO</span>
    <h1>${esc(course.title)}</h1>
    <p class="muted-text">
      ${esc(course.description || "")}
    </p>
  `;

  const { data: modules, error: modulesError } = await sbA
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position");

  if (modulesError) {
    msgA.textContent = modulesError.message;
    return;
  }

  document.getElementById("moduleSelect").innerHTML =
    (modules || [])
      .map(module => `
        <option value="${module.id}">
          ${esc(module.title)}
        </option>
      `)
      .join("");

  document.getElementById("modules").innerHTML =
    (modules || [])
      .map(module => {
        const lessons = (module.lessons || [])
          .sort((a, b) => a.position - b.position);

        return `
          <div class="module">

            <div class="module-head">
              <div>
                <b>${esc(module.title)}</b>
              </div>

              <div class="course-actions">
                <button
                  type="button"
                  class="btn btn-outline edit-module"
                  data-id="${module.id}"
                  data-title="${esc(module.title)}"
                >
                  Editar
                </button>

                <button
                  type="button"
                  class="btn btn-outline delete-module"
                  data-id="${module.id}"
                  data-title="${esc(module.title)}"
                >
                  Excluir
                </button>
              </div>
            </div>

            ${
              lessons.length
                ? lessons.map(lesson => `
                  <div class="lesson-row">

                    <div>
                      <b>${esc(lesson.title)}</b>

                      <small>
                        ${lesson.duration_minutes || 0} min ·
                        ${lesson.published ? "Publicado" : "Rascunho"}
                      </small>
                    </div>

                    <div class="course-actions">

                      <button
                        type="button"
                        class="btn btn-outline edit-lesson"
                        data-id="${lesson.id}"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        class="btn btn-outline delete-lesson"
                        data-id="${lesson.id}"
                        data-title="${esc(lesson.title)}"
                      >
                        Excluir
                      </button>

                    </div>

                  </div>
                `).join("")
                : `
                  <div class="lesson-row">
                    <small>Nenhuma aula neste módulo.</small>
                  </div>
                `
            }

          </div>
        `;
      })
      .join("");

  activateButtons();
}

function activateButtons() {
  document
    .querySelectorAll(".edit-module")
    .forEach(button => {
      button.onclick = () =>
        editModule(
          button.dataset.id,
          button.dataset.title
        );
    });

  document
    .querySelectorAll(".delete-module")
    .forEach(button => {
      button.onclick = () =>
        deleteModule(
          button.dataset.id,
          button.dataset.title
        );
    });

  document
    .querySelectorAll(".edit-lesson")
    .forEach(button => {
      button.onclick = () =>
        editLesson(button.dataset.id);
    });

  document
    .querySelectorAll(".delete-lesson")
    .forEach(button => {
      button.onclick = () =>
        deleteLesson(
          button.dataset.id,
          button.dataset.title
        );
    });
}

/* =========================
   CRIAR MÓDULO
========================= */

document.getElementById("moduleForm").onsubmit =
  async event => {

    event.preventDefault();

    const title =
      document.getElementById("moduleTitle").value.trim();

    if (!title) return;

    const { count } = await sbA
      .from("modules")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("course_id", courseId);

    const { error } = await sbA
      .from("modules")
      .insert({
        course_id: courseId,
        title,
        position: (count || 0) + 1
      });

    msgA.textContent =
      error?.message || "Módulo criado!";

    if (!error) {
      event.target.reset();
      await render();
    }
  };

/* =========================
   EDITAR MÓDULO
========================= */

async function editModule(moduleId, currentTitle) {

  const newTitle = prompt(
    "Nome do módulo:",
    currentTitle
  );

  if (newTitle === null) return;

  if (!newTitle.trim()) {
    alert("O nome do módulo não pode ficar vazio.");
    return;
  }

  const { error } = await sbA
    .from("modules")
    .update({
      title: newTitle.trim()
    })
    .eq("id", moduleId);

  if (error) {
    msgA.textContent = error.message;
    return;
  }

  msgA.textContent =
    "Módulo atualizado com sucesso!";

  await render();
}

/* =========================
   EXCLUIR MÓDULO
========================= */

async function deleteModule(moduleId, title) {

  const confirmed = confirm(
    `Excluir o módulo "${title}"?\n\n` +
    `As aulas desse módulo também serão excluídas.`
  );

  if (!confirmed) return;

  msgA.textContent = "Excluindo módulo...";

  // Primeiro apagamos as aulas.
  const { error: lessonsError } = await sbA
    .from("lessons")
    .delete()
    .eq("module_id", moduleId);

  if (lessonsError) {
    msgA.textContent =
      "Erro ao excluir as aulas: " +
      lessonsError.message;

    return;
  }

  // Depois apagamos o módulo.
  const { error: moduleError } = await sbA
    .from("modules")
    .delete()
    .eq("id", moduleId);

  if (moduleError) {
    msgA.textContent =
      "Erro ao excluir o módulo: " +
      moduleError.message;

    return;
  }

  msgA.textContent =
    "Módulo excluído com sucesso!";

  await render();
}

/* =========================
   CRIAR AULA
========================= */

document.getElementById("lessonForm").onsubmit =
  async event => {

    event.preventDefault();

    const moduleId =
      document.getElementById("moduleSelect").value;

    if (!moduleId) {
      msgA.textContent =
        "Crie um módulo antes de adicionar uma aula.";

      return;
    }

    const { count } = await sbA
      .from("lessons")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("module_id", moduleId);

    const { error } = await sbA
      .from("lessons")
      .insert({
        module_id: moduleId,

        title:
          document.getElementById("lessonTitle")
            .value.trim(),

        description:
          document.getElementById("lessonDescription")
            .value.trim(),

        video_url:
          document.getElementById("videoUrl")
            .value.trim() || null,

        material_url:
          document.getElementById("materialUrl")
            .value.trim() || null,

        duration_minutes:
          Number(
            document.getElementById("duration")
              .value || 0
          ),

        position: (count || 0) + 1
      });

    msgA.textContent =
      error?.message || "Aula criada!";

    if (!error) {
      event.target.reset();
      await render();
    }
  };

/* =========================
   EDITAR AULA
========================= */

async function editLesson(lessonId) {

  const { data: lesson, error } = await sbA
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    msgA.textContent =
      error?.message ||
      "Não foi possível carregar a aula.";

    return;
  }

  const title = prompt(
    "Título da aula:",
    lesson.title
  );

  if (title === null) return;

  const description = prompt(
    "Descrição:",
    lesson.description || ""
  );

  if (description === null) return;

  const videoUrl = prompt(
    "URL do vídeo:",
    lesson.video_url || ""
  );

  if (videoUrl === null) return;

  const materialUrl = prompt(
    "URL do material:",
    lesson.material_url || ""
  );

  if (materialUrl === null) return;

  const duration = prompt(
    "Duração em minutos:",
    lesson.duration_minutes || 0
  );

  if (duration === null) return;

  const published = confirm(
    "Deseja deixar esta aula PUBLICADA?\n\n" +
    "OK = Publicada\n" +
    "Cancelar = Rascunho"
  );

  const { error: updateError } = await sbA
    .from("lessons")
    .update({
      title: title.trim(),
      description: description.trim(),
      video_url: videoUrl.trim() || null,
      material_url: materialUrl.trim() || null,
      duration_minutes: Number(duration || 0),
      published
    })
    .eq("id", lessonId);

  if (updateError) {
    msgA.textContent = updateError.message;
    return;
  }

  msgA.textContent =
    "Aula atualizada com sucesso!";

  await render();
}

/* =========================
   EXCLUIR AULA
========================= */

async function deleteLesson(lessonId, title) {

  const confirmed = confirm(
    `Tem certeza que deseja excluir a aula "${title}"?`
  );

  if (!confirmed) return;

  msgA.textContent = "Excluindo aula...";

  // Remove progresso relacionado à aula.
  const { error: progressError } = await sbA
    .from("lesson_progress")
    .delete()
    .eq("lesson_id", lessonId);

  if (progressError) {
    msgA.textContent =
      "Erro ao remover o progresso da aula: " +
      progressError.message;

    return;
  }

  const { error } = await sbA
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) {
    msgA.textContent =
      "Erro ao excluir a aula: " +
      error.message;

    return;
  }

  msgA.textContent =
    "Aula excluída com sucesso!";

  await render();
}

/* =========================
   LOGOUT
========================= */

document.getElementById("logout").onclick =
  async () => {

    await sbA.auth.signOut();
    location.href = "index.html";
  };

/* =========================
   SEGURANÇA
========================= */

function esc(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
}

init();
