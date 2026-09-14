const sb2 = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const box = document.getElementById("lesson");


async function initLesson() {

  const {
    data: { user }
  } = await sb2.auth.getUser();


  if (!user) {
    location.href = "login.html";
    return;
  }


  const id = (
    new URLSearchParams(
      location.search
    ).get("id") || ""
  ).trim();


  if (!id) {
    box.innerHTML =
      "<h1>Aula não encontrada.</h1>";

    return;
  }


  /* =========================
     MATRÍCULA DO ALUNO
  ========================= */

  const {
    data: enrollment,
    error: enrollmentError
  } = await sb2
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();


  if (
    enrollmentError ||
    !enrollment
  ) {

    box.innerHTML = `
      <h1>Acesso não liberado.</h1>

      <p>
        Seu usuário não possui
        matrícula ativa.
      </p>
    `;

    return;
  }


  /* =========================
     AULA ATUAL
  ========================= */

  const {
    data: lesson,
    error
  } = await sb2
    .from("lessons")
    .select(`
      *,
      modules(
        id,
        title,
        course_id,
        position
      )
    `)
    .eq("id", id)
    .single();


  if (
    error ||
    !lesson ||
    lesson.modules.course_id !==
      enrollment.course_id
  ) {

    box.innerHTML =
      "<h1>Aula indisponível.</h1>";

    return;
  }


  /* =========================
     TODAS AS AULAS DO CURSO
  ========================= */

  const {
    data: modules,
    error: modulesError
  } = await sb2
    .from("modules")
    .select(`
      id,
      title,
      position,
      lessons(
        id,
        title,
        position,
        published
      )
    `)
    .eq(
      "course_id",
      enrollment.course_id
    )
    .order(
      "position",
      { ascending: true }
    );


  if (modulesError) {

    console.error(
      "Erro ao carregar aulas:",
      modulesError
    );

  }


  /* =========================
     ORDENAR AULAS
  ========================= */

  const allLessons = [];


  (modules || [])
    .sort(
      (a, b) =>
        (a.position || 0) -
        (b.position || 0)
    )
    .forEach(module => {

      const lessons =
        [...(module.lessons || [])]
          .filter(
            item =>
              item.published !== false
          )
          .sort(
            (a, b) =>
              (a.position || 0) -
              (b.position || 0)
          );


      lessons.forEach(item => {

        allLessons.push({
          ...item,
          module_title:
            module.title
        });

      });

    });


  const currentIndex =
    allLessons.findIndex(
      item =>
        item.id === lesson.id
    );


  const previousLesson =
    currentIndex > 0
      ? allLessons[
          currentIndex - 1
        ]
      : null;


  const nextLesson =
    currentIndex >= 0 &&
    currentIndex <
      allLessons.length - 1
      ? allLessons[
          currentIndex + 1
        ]
      : null;


  /* =========================
     CONTEÚDO DA AULA
  ========================= */

  box.innerHTML = `

    <span class="eyebrow">
      ${escapeHtml(
        lesson.modules.title
      )}
    </span>


    <h1>
      ${escapeHtml(
        lesson.title
      )}
    </h1>


    <p class="muted-text">
      ${escapeHtml(
        lesson.description || ""
      )}
    </p>


    <div class="video">

      ${
        lesson.video_url
          ? `
            <iframe
              width="100%"
              height="100%"
              style="
                border:0;
                border-radius:18px;
              "
              src="${escapeAttr(
                lesson.video_url
              )}"
              allowfullscreen
            ></iframe>
          `
          : "Vídeo da aula"
      }

    </div>


    <div class="lesson-navigation">

      <a
        href="aluno.html"
        class="btn btn-outline lesson-back"
      >
        ← Voltar para o curso
      </a>


      <div class="lesson-navigation-pages">

        ${
          previousLesson
            ? `
              <a
                href="aula.html?id=${previousLesson.id}"
                class="btn btn-outline"
              >
                ← Aula anterior
              </a>
            `
            : `
              <button
                type="button"
                class="btn btn-outline"
                disabled
              >
                ← Aula anterior
              </button>
            `
        }


        ${
          nextLesson
            ? `
              <a
                href="aula.html?id=${nextLesson.id}"
                class="btn"
              >
                Próxima aula →
              </a>
            `
            : `
              <button
                type="button"
                class="btn"
                disabled
              >
                Fim do curso
              </button>
            `
        }

      </div>

    </div>


    <div
      id="lessonMsg"
      class="message"
    ></div>

  `;

}


/* =========================
   SAIR
========================= */

document
  .getElementById("logout")
  .onclick =
  async () => {

    await sb2.auth.signOut();

    location.href =
      "index.html";

  };


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


function escapeAttr(value) {

  return String(
    value ?? ""
  ).replace(
    /"/g,
    "&quot;"
  );

}


initLesson();
