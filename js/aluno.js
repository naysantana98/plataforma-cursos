const sb =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


const area =
  document.getElementById("courseArea");


const msg =
  document.getElementById("message");



/* =====================================
   INICIAR
===================================== */

async function init() {

  const {
    data: { user },
    error: userError
  } = await sb.auth.getUser();


  if (userError || !user) {

    location.href = "login.html";

    return;
  }


  /* =====================================
     DADOS DO ALUNO
  ===================================== */

  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Aluno";


  document
    .getElementById("welcome")
    .textContent = name;


  document
    .getElementById("studentTopName")
    .textContent = name;


  document
    .getElementById("userName")
    .textContent = user.email || "";


  document
    .getElementById("studentAvatar")
    .textContent =
      name.charAt(0).toUpperCase();


  /* =====================================
     MATRÍCULAS
  ===================================== */

  const {
    data: enrollments,
    error: enrollmentError
  } = await sb
    .from("enrollments")
    .select(`
      course_id,
      status,
      courses(
        id,
        title,
        description
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");


  if (enrollmentError) {

    msg.textContent =
      enrollmentError.message;

    return;
  }


  /* =====================================
     SEM CURSOS
  ===================================== */

  if (!enrollments?.length) {

    area.innerHTML = `

      <div class="student-empty">

        <div class="student-empty-icon">
          ◇
        </div>

        <h2>
          Nenhum curso disponível
        </h2>

        <p>
          Após a confirmação do pagamento,
          seu curso aparecerá aqui automaticamente.
        </p>

      </div>

    `;

    return;
  }


  /* =====================================
     CARREGAR TODOS OS CURSOS
  ===================================== */

  let html = "";


  for (const enrollment of enrollments) {

    const course =
      enrollment.courses;


    if (!course) continue;


    const {
      data: modules,
      error: modulesError
    } = await sb
      .from("modules")
      .select(`
        id,
        title,
        position,
        lessons(
          id,
          title,
          description,
          video_url,
          material_url,
          duration_minutes,
          position,
          published
        )
      `)
      .eq("course_id", course.id)
      .order(
        "position",
        { ascending: true }
      );


    if (modulesError) {

      msg.textContent =
        modulesError.message;

      return;
    }


    html += renderCourse(
      course,
      modules || []
    );

  }


  area.innerHTML = html;
}



/* =====================================
   MOSTRAR CURSO
===================================== */

function renderCourse(
  course,
  modules
) {

  const totalLessons =
    modules.reduce(
      (total, module) => {

        const publishedLessons =
          (module.lessons || [])
            .filter(
              lesson =>
                lesson.published === true
            );

        return (
          total +
          publishedLessons.length
        );

      },
      0
    );


  let html = `

    <article class="student-course">

      <!-- CABEÇALHO DO CURSO -->

      <div class="student-course-hero">

        <div class="student-course-icon">
          ◇
        </div>


        <div class="student-course-info">

          <span class="student-eyebrow">
            MEU CURSO
          </span>

          <h2>
            ${escapeHtml(course.title)}
          </h2>

          <p>
            ${escapeHtml(
              course.description || ""
            )}
          </p>

        </div>


        <div class="student-course-count">

          <strong>
            ${totalLessons}
          </strong>

          <span>
            ${
              totalLessons === 1
                ? "aula"
                : "aulas"
            }
          </span>

        </div>

      </div>


      <!-- CONTEÚDO -->

      <div class="student-content">

        <div class="student-content-title">

          <span class="student-eyebrow">
            CONTEÚDO DO CURSO
          </span>

          <h3>
            Módulos e aulas
          </h3>

        </div>

  `;


  let visibleModuleNumber = 0;


  for (const module of modules) {

    const lessons =
      [...(module.lessons || [])]

        .filter(
          lesson =>
            lesson.published === true
        )

        .sort(
          (a, b) =>
            (a.position || 0) -
            (b.position || 0)
        );


    /*
      Não mostra módulo vazio
      para o aluno.
    */

    if (!lessons.length) {
      continue;
    }


    visibleModuleNumber++;


    const moduleNumber =
      String(visibleModuleNumber)
        .padStart(2, "0");


    html += `

      <div class="student-module">

        <div class="student-module-header">

          <div class="student-module-number">
            ${moduleNumber}
          </div>


          <div class="student-module-title">

            <span>
              MÓDULO ${moduleNumber}
            </span>

            <h4>
              ${escapeHtml(module.title)}
            </h4>

          </div>


          <div class="student-module-count">

            ${lessons.length}

            ${
              lessons.length === 1
                ? "aula"
                : "aulas"
            }

          </div>

        </div>


        <div class="student-lessons">

    `;


    lessons.forEach(
      (lesson, index) => {

        const lessonNumber =
          String(index + 1)
            .padStart(2, "0");


        const duration =
          Number(
            lesson.duration_minutes || 0
          );


        html += `

          <div class="student-lesson">

            <div class="student-lesson-number">
              ${lessonNumber}
            </div>


            <div class="student-lesson-info">

              <strong>
                ${escapeHtml(lesson.title)}
              </strong>


              <div class="student-lesson-meta">

                <span class="available-dot"></span>

                <span>
                  Aula disponível
                </span>

                ${
                  duration > 0
                    ? `
                      <span class="meta-separator">
                        •
                      </span>

                      <span>
                        ${duration} min
                      </span>
                    `
                    : ""
                }

              </div>

            </div>


            <a
              class="student-watch-btn"
              href="aula.html?id=${encodeURIComponent(
                lesson.id
              )}"
            >
              Assistir aula
              <span>→</span>
            </a>

          </div>

        `;

      }
    );


    html += `

        </div>

      </div>

    `;

  }


  if (visibleModuleNumber === 0) {

    html += `

      <div class="student-no-lessons">

        <span>
          ◇
        </span>

        <div>

          <strong>
            Conteúdo em preparação
          </strong>

          <p>
            As aulas deste curso ainda
            não foram publicadas.
          </p>

        </div>

      </div>

    `;

  }


  html += `

      </div>

    </article>

  `;


  return html;
}



/* =====================================
   LOGOUT
===================================== */

document
  .getElementById("logout")
  .onclick =
    async () => {

      await sb.auth.signOut();

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


init();
