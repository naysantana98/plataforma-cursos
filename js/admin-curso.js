const sbA = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const courseId = (
  new URLSearchParams(window.location.search).get("id") || ""
).trim();

const msgA = document.getElementById("message");

const courseBox = document.getElementById("course");
const modulesBox = document.getElementById("modules");

const moduleForm = document.getElementById("moduleForm");
const moduleTitle = document.getElementById("moduleTitle");

const lessonForm = document.getElementById("lessonForm");
const moduleSelect = document.getElementById("moduleSelect");
const lessonTitle = document.getElementById("lessonTitle");
const lessonDescription = document.getElementById("lessonDescription");
const videoUrl = document.getElementById("videoUrl");
const materialUrl = document.getElementById("materialUrl");
const duration = document.getElementById("duration");

const logoutButton = document.getElementById("logout");


/* =========================
   INICIAR
========================= */

async function init() {
  if (!courseId) {
    msgA.textContent = "ID do curso não encontrado.";
    return;
  }

  const {
    data: { user },
    error: userError
  } = await sbA.auth.getUser();

  if (userError || !user) {
    location.href = "login.html";
    return;
  }

  const {
    data: profile,
    error: profileError
  } = await sbA
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {
    location.href = "aluno.html";
    return;
  }

  await render();
}


/* =========================
   CARREGAR CURSO
========================= */

async function render() {
  msgA.textContent = "";

  const {
    data: course,
    error: courseError
  } = await sbA
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    console.error("Erro curso:", courseError);

    msgA.textContent =
      "Não foi possível carregar o curso.";

    return;
  }

  courseBox.innerHTML = `
    <span class="eyebrow">CURSO</span>

    <h1>
      ${escapeHtml(course.title)}
    </h1>

    <p class="muted-text">
      ${escapeHtml(course.description || "")}
    </p>
  `;

  await loadModules();
}


/* =========================
   CARREGAR MÓDULOS E AULAS
========================= */

async function loadModules() {
  const {
    data: modules,
    error
  } = await sbA
    .from("modules")
    .select(`
      *,
      lessons (*)
    `)
    .eq("course_id", courseId)
    .order("position", {
      ascending: true
    });

  if (error) {
    console.error("Erro módulos:", error);

    msgA.textContent =
      "Erro ao carregar os módulos: " +
      error.message;

    return;
  }

  const moduleList = modules || [];

  moduleSelect.innerHTML =
    moduleList.length
      ? moduleList
          .map(module => `
            <option value="${module.id}">
              ${escapeHtml(module.title)}
            </option>
          `)
          .join("")
      : `
        <option value="">
          Crie um módulo primeiro
        </option>
      `;

  modulesBox.innerHTML =
    moduleList.length
      ? moduleList
          .map(module =>
            renderModule(module)
          )
          .join("")
      : `
        <div class="module">
          <div class="lesson-row">
            <small>
              Nenhum módulo cadastrado.
            </small>
          </div>
        </div>
      `;

  activateModuleButtons();
  activateLessonButtons();
}


/* =========================
   HTML DE UM MÓDULO
========================= */

function renderModule(module) {
  const lessons = [
    ...(module.lessons || [])
  ].sort(
    (a, b) =>
      (a.position || 0) -
      (b.position || 0)
  );

  return `
    <div class="module">

      <div class="module-head">

        <div>
          <b>
            ${escapeHtml(module.title)}
          </b>
        </div>

        <div class="course-actions">

          <button
            type="button"
            class="btn btn-outline edit-module"
            data-id="${module.id}"
            data-title="${escapeAttribute(module.title)}"
          >
            Editar
          </button>

          <button
            type="button"
            class="btn btn-outline delete-module"
            data-id="${module.id}"
            data-title="${escapeAttribute(module.title)}"
          >
            Excluir
          </button>

        </div>

      </div>

      ${
        lessons.length
          ? lessons
              .map(lesson =>
                renderLesson(lesson)
              )
              .join("")
          : `
            <div class="lesson-row">
              <small>
                Nenhuma aula neste módulo.
              </small>
            </div>
          `
      }

    </div>
  `;
}


/* =========================
   HTML DE UMA AULA
========================= */

function renderLesson(lesson) {
  return `
    <div class="lesson-row">

      <div>

        <b>
          ${escapeHtml(lesson.title)}
        </b>

        <small>
          ${lesson.duration_minutes || 0} min ·
          ${
            lesson.published
              ? "Publicado"
              : "Rascunho"
          }
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
          data-title="${escapeAttribute(lesson.title)}"
        >
          Excluir
        </button>

      </div>

    </div>
  `;
}


/* =========================
   CRIAR MÓDULO
========================= */

moduleForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const title =
      moduleTitle.value.trim();

    if (!title) {
      msgA.textContent =
        "Informe o nome do módulo.";

      return;
    }

    const {
      count,
      error: countError
    } = await sbA
      .from("modules")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq("course_id", courseId);

    if (countError) {
      msgA.textContent =
        countError.message;

      return;
    }

    const {
      error
    } = await sbA
      .from("modules")
      .insert({
        course_id: courseId,
        title,
        position: (count || 0) + 1
      });

    if (error) {
      msgA.textContent =
        error.message;

      return;
    }

    moduleForm.reset();

    msgA.textContent =
      "Módulo criado com sucesso!";

    await loadModules();
  }
);


/* =========================
   CRIAR AULA
========================= */

lessonForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    const selectedModule =
      moduleSelect.value;

    if (!selectedModule) {
      msgA.textContent =
        "Crie um módulo antes de adicionar uma aula.";

      return;
    }

    const title =
      lessonTitle.value.trim();

    if (!title) {
      msgA.textContent =
        "Informe o título da aula.";

      return;
    }

    const {
      count,
      error: countError
    } = await sbA
      .from("lessons")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq(
        "module_id",
        selectedModule
      );

    if (countError) {
      msgA.textContent =
        countError.message;

      return;
    }

    const {
      error
    } = await sbA
      .from("lessons")
      .insert({
        module_id: selectedModule,

        title,

        description:
          lessonDescription.value.trim(),

        video_url:
          videoUrl.value.trim() || null,

        material_url:
          materialUrl.value.trim() || null,

        duration_minutes:
          Number(
            duration.value || 0
          ),

        position:
          (count || 0) + 1,

        published: true
      });

    if (error) {
      msgA.textContent =
        error.message;

      return;
    }

    lessonForm.reset();

    msgA.textContent =
      "Aula criada com sucesso!";

    await loadModules();
  }
);


/* =========================
   BOTÕES DOS MÓDULOS
========================= */

function activateModuleButtons() {
  document
    .querySelectorAll(
      ".edit-module"
    )
    .forEach(button => {
      button.onclick = async () => {
        await editModule(
          button.dataset.id
        );
      };
    });

  document
    .querySelectorAll(
      ".delete-module"
    )
    .forEach(button => {
      button.onclick = async () => {
        await deleteModule(
          button.dataset.id,
          button.dataset.title
        );
      };
    });
}


/* =========================
   EDITAR MÓDULO
========================= */

async function editModule(moduleId) {
  const {
    data: module,
    error
  } = await sbA
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (error || !module) {
    msgA.textContent =
      error?.message ||
      "Não foi possível carregar o módulo.";

    return;
  }

  const newTitle = prompt(
    "Nome do módulo:",
    module.title || ""
  );

  if (newTitle === null) {
    return;
  }

  if (!newTitle.trim()) {
    alert(
      "O nome do módulo não pode ficar vazio."
    );

    return;
  }

  const {
    error: updateError
  } = await sbA
    .from("modules")
    .update({
      title: newTitle.trim()
    })
    .eq(
      "id",
      moduleId
    );

  if (updateError) {
    msgA.textContent =
      updateError.message;

    return;
  }

  msgA.textContent =
    "Módulo atualizado com sucesso!";

  await loadModules();
}


/* =========================
   EXCLUIR MÓDULO
========================= */

async function deleteModule(
  moduleId,
  title
) {
  const confirmed = confirm(
    `Tem certeza que deseja excluir o módulo "${title}"?\n\nAs aulas deste módulo também serão excluídas.`
  );

  if (!confirmed) {
    return;
  }

  const {
    data: lessons,
    error: lessonsError
  } = await sbA
    .from("lessons")
    .select("id")
    .eq(
      "module_id",
      moduleId
    );

  if (lessonsError) {
    msgA.textContent =
      lessonsError.message;

    return;
  }

  const lessonIds =
    (lessons || [])
      .map(lesson => lesson.id);

  if (lessonIds.length) {
    const {
      error: progressError
    } = await sbA
      .from("lesson_progress")
      .delete()
      .in(
        "lesson_id",
        lessonIds
      );

    if (progressError) {
      msgA.textContent =
        progressError.message;

      return;
    }

    const {
      error: deleteLessonsError
    } = await sbA
      .from("lessons")
      .delete()
      .in(
        "id",
        lessonIds
      );

    if (deleteLessonsError) {
      msgA.textContent =
        deleteLessonsError.message;

      return;
    }
  }

  const {
    error
  } = await sbA
    .from("modules")
    .delete()
    .eq(
      "id",
      moduleId
    );

  if (error) {
    msgA.textContent =
      error.message;

    return;
  }

  msgA.textContent =
    "Módulo excluído com sucesso!";

  await loadModules();
}


/* =========================
   BOTÕES DAS AULAS
========================= */

function activateLessonButtons() {
  document
    .querySelectorAll(
      ".edit-lesson"
    )
    .forEach(button => {
      button.onclick = async () => {
        await editLesson(
          button.dataset.id
        );
      };
    });

  document
    .querySelectorAll(
      ".delete-lesson"
    )
    .forEach(button => {
      button.onclick = async () => {
        await deleteLesson(
          button.dataset.id,
          button.dataset.title
        );
      };
    });
}


/* =========================
   EDITAR AULA
========================= */

async function editLesson(lessonId) {
  const {
    data: lesson,
    error
  } = await sbA
    .from("lessons")
    .select("*")
    .eq(
      "id",
      lessonId
    )
    .single();

  if (error || !lesson) {
    msgA.textContent =
      error?.message ||
      "Não foi possível carregar a aula.";

    return;
  }

  const title = prompt(
    "Título da aula:",
    lesson.title || ""
  );

  if (title === null) {
    return;
  }

  const description = prompt(
    "Descrição:",
    lesson.description || ""
  );

  if (description === null) {
    return;
  }

  const newVideoUrl = prompt(
    "URL do vídeo:",
    lesson.video_url || ""
  );

  if (newVideoUrl === null) {
    return;
  }

  const newMaterialUrl = prompt(
    "URL do material:",
    lesson.material_url || ""
  );

  if (newMaterialUrl === null) {
    return;
  }

  const newDuration = prompt(
    "Duração em minutos:",
    lesson.duration_minutes || 0
  );

  if (newDuration === null) {
    return;
  }

  const published = confirm(
    "Deseja deixar a aula publicada?\n\nOK = Publicada\nCancelar = Rascunho"
  );

  const {
    error: updateError
  } = await sbA
    .from("lessons")
    .update({
      title: title.trim(),

      description:
        description.trim(),

      video_url:
        newVideoUrl.trim() || null,

      material_url:
        newMaterialUrl.trim() || null,

      duration_minutes:
        Number(
          newDuration || 0
        ),

      published
    })
    .eq(
      "id",
      lessonId
    );

  if (updateError) {
    msgA.textContent =
      updateError.message;

    return;
  }

  msgA.textContent =
    "Aula atualizada com sucesso!";

  await loadModules();
}


/* =========================
   EXCLUIR AULA
========================= */

async function deleteLesson(
  lessonId,
  title
) {
  const confirmed = confirm(
    `Tem certeza que deseja excluir a aula "${title}"?`
  );

  if (!confirmed) {
    return;
  }

  const {
    error: progressError
  } = await sbA
    .from("lesson_progress")
    .delete()
    .eq(
      "lesson_id",
      lessonId
    );

  if (progressError) {
    msgA.textContent =
      progressError.message;

    return;
  }

  const {
    error
  } = await sbA
    .from("lessons")
    .delete()
    .eq(
      "id",
      lessonId
    );

  if (error) {
    msgA.textContent =
      error.message;

    return;
  }

  msgA.textContent =
    "Aula excluída com sucesso!";

  await loadModules();
}


/* =========================
   LOGOUT
========================= */

if (logoutButton) {
  logoutButton.onclick =
    async () => {
      await sbA.auth.signOut();

      location.href =
        "index.html";
    };
}


/* =========================
   SEGURANÇA
========================= */

function escapeHtml(value) {
  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


init();
