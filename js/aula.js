const sb2 = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const box =
  document.getElementById("lesson");


async function initLesson() {

  /* =====================================
     USUÁRIO
  ===================================== */

  const {
    data: { user },
    error: userError
  } = await sb2.auth.getUser();


  if (userError || !user) {

    location.href = "login.html";

    return;
  }


  const lessonId = (
    new URLSearchParams(
      location.search
    ).get("id") || ""
  ).trim();


  if (!lessonId) {

    showError(
      "Aula não encontrada.",
      "Não foi possível identificar a aula."
    );

    return;
  }


  /* =====================================
     CARREGAR AULA
  ===================================== */

  const {
    data: lesson,
    error: lessonError
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
    .eq("id", lessonId)
    .single();


  if (
    lessonError ||
    !lesson ||
    !lesson.modules
  ) {

    showError(
      "Aula indisponível.",
      "Esta aula não foi encontrada."
    );

    return;
  }


  /* =====================================
     BLOQUEAR RASCUNHO
  ===================================== */

  if (lesson.published !== true) {

    showError(
      "Aula indisponível.",
      "Esta aula ainda não foi publicada."
    );

    return;
  }


  const courseId =
    lesson.modules.course_id;


  /* =====================================
     VALIDAR MATRÍCULA DESTE CURSO
  ===================================== */

  const {
    data: enrollment,
    error: enrollmentError
  } = await sb2
    .from("enrollments")
    .select("id, course_id, status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();


  if (
    enrollmentError ||
    !enrollment
  ) {

    showError(
      "Acesso não liberado.",
      "Você não possui matrícula ativa para este curso."
    );

    return;
  }


  /* =====================================
     CARREGAR CURSO
  ===================================== */

  const {
    data: course
  } = await sb2
    .from("courses")
    .select("id, title")
    .eq("id", courseId)
    .maybeSingle();


  /* =====================================
     TODAS AS AULAS PUBLICADAS
  ===================================== */

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
    .eq("course_id", courseId)
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


  /* =====================================
     ORGANIZAR NAVEGAÇÃO
  ===================================== */

  const allLessons = [];


  [...(modules || [])]
    .sort(
      (a, b) =>
        (a.position || 0) -
        (b.position || 0)
    )
    .forEach(module => {

      const publishedLessons =
        [...(module.lessons || [])]

          .filter(
            item =>
              item.published === true
          )

          .sort(
            (a, b) =>
              (a.position || 0) -
              (b.position || 0)
          );


      publishedLessons.forEach(
        item => {

          allLessons.push({

            ...item,

            module_title:
              module.title

          });

        }
      );

    });


  const currentIndex =
    allLessons.findIndex(
      item =>
        item.id === lesson.id
    );


  const previousLesson =
    currentIndex > 0
      ? allLessons[currentIndex - 1]
      : null;


  const nextLesson =
    currentIndex >= 0 &&
    currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;


  const lessonPosition =
    currentIndex >= 0
      ? currentIndex + 1
      : 1;


  const totalLessons =
    allLessons.length;


  /* =====================================
     MATERIAL
  ===================================== */

  const materialButton =
    lesson.material_url
      ? `
        <a
          class="premium-material-btn"
          href="${escapeAttr(
            lesson.material_url
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="material-icon">
            ↓
          </span>

          Material da aula
        </a>
      `
      : "";


  /* =====================================
     MOSTRAR AULA
  ===================================== */

  box.innerHTML = `

    <div class="premium-lesson-header">

      <div class="premium-lesson-breadcrumb">

        <span>
          ${escapeHtml(
            course?.title ||
            "Meu curso"
          )}
        </span>

        <span class="breadcrumb-separator">
          /
        </span>

        <span>
          ${escapeHtml(
            lesson.modules.title
          )}
        </span>

      </div>


      <div class="premium-lesson-title-row">

        <div>

          <span class="premium-eyebrow">
            ${
              escapeHtml(
                lesson.modules.title
              )
            }
          </span>

          <h1>
            ${escapeHtml(
              lesson.title
            )}
          </h1>

        </div>


        <div class="premium-lesson-position">

          <strong>
            ${lessonPosition}
          </strong>

          <span>
            de ${totalLessons}
          </span>

        </div>

      </div>


      ${
        lesson.description
          ? `
            <p class="premium-lesson-description">
              ${escapeHtml(
                lesson.description
              )}
            </p>
          `
          : ""
      }

    </div>


    <!-- PLAYER -->

    <div class="premium-video-card">

      <div class="premium-video">

        ${
          lesson.video_url
            ? `
              <iframe
                src="${escapeAttr(
                  lesson.video_url
                )}"
                title="${escapeAttr(
                  lesson.title
                )}"
                allow="
                  accelerometer;
                  autoplay;
                  clipboard-write;
                  encrypted-media;
                  gyroscope;
                  picture-in-picture
                "
                allowfullscreen
              ></iframe>
            `
            : `
              <div class="premium-video-empty">

                <div class="video-play-icon">
                  ▶
                </div>

                <strong>
                  Vídeo da aula
                </strong>

                <span>
                  O vídeo será exibido aqui.
                </span>

              </div>
            `
        }

      </div>


      ${
        lesson.material_url
          ? `
            <div class="premium-video-footer">

              <div>

                <span class="premium-eyebrow">
                  MATERIAL
                </span>

                <strong>
                  Conteúdo complementar
                </strong>

              </div>

              ${materialButton}

            </div>
          `
          : ""
      }

    </div>


    <!-- NAVEGAÇÃO -->

    <div class="premium-lesson-navigation">

      <a
        href="aluno.html"
        class="premium-back-course"
      >
        <span>←</span>

        Voltar para o curso
      </a>


      <div class="premium-page-navigation">

        ${
          previousLesson
            ? `
              <a
                href="aula.html?id=${encodeURIComponent(
                  previousLesson.id
                )}"
                class="
                  premium-nav-btn
                  premium-nav-secondary
                "
              >
                <span>←</span>

                <div>
                  <small>
                    ANTERIOR
                  </small>

                  <strong>
                    ${escapeHtml(
                      previousLesson.title
                    )}
                  </strong>
                </div>
              </a>
            `
            : `
              <button
                type="button"
                class="
                  premium-nav-btn
                  premium-nav-secondary
                "
                disabled
              >
                <span>←</span>

                <div>
                  <small>
                    ANTERIOR
                  </small>

                  <strong>
                    Primeira aula
                  </strong>
                </div>
              </button>
            `
        }


        ${
          nextLesson
            ? `
              <a
                href="aula.html?id=${encodeURIComponent(
                  nextLesson.id
                )}"
                class="
                  premium-nav-btn
                  premium-nav-next
                "
              >

                <div>
                  <small>
                    PRÓXIMA
                  </small>

                  <strong>
                    ${escapeHtml(
                      nextLesson.title
                    )}
                  </strong>
                </div>

                <span>→</span>

              </a>
            `
            : `
              <button
                type="button"
                class="
                  premium-nav-btn
                  premium-nav-next
                "
                disabled
              >

                <div>
                  <small>
                    CURSO
                  </small>

                  <strong>
                    Fim do curso
                  </strong>
                </div>

                <span>✓</span>

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


/* =====================================
   ERROS
===================================== */

function showError(
  title,
  description
) {

  box.innerHTML = `

    <div class="premium-lesson-error">

      <div class="premium-error-icon">
        ◇
      </div>

      <h1>
        ${escapeHtml(title)}
      </h1>

      <p>
        ${escapeHtml(description)}
      </p>

      <a
        href="aluno.html"
        class="premium-error-back"
      >
        ← Voltar para meus cursos
      </a>

    </div>

  `;
}


/* =====================================
   LOGOUT
===================================== */

document
  .getElementById("logout")
  .onclick =
  async () => {

    await sb2.auth.signOut();

    location.href =
      "index.html";

  };


/* =====================================
   SEGURANÇA
===================================== */

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

  return escapeHtml(value);
}


initLesson();
