const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const area =
  document.getElementById("courseArea");

const msg =
  document.getElementById("message");


/* =====================================
   INICIAR ÁREA DO ALUNO
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
     PERFIL DO ALUNO
  ===================================== */

  const {
    data: profile
  } = await sb
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();


  const name =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Aluno";


  /* =====================================
   EXIBIR DADOS DO ALUNO
===================================== */

const welcome =
  document.getElementById("welcome");

const studentTopName =
  document.getElementById("studentTopName");

const userName =
  document.getElementById("userName");

const studentAvatar =
  document.getElementById("studentAvatar");


/* NOME NA BOAS-VINDAS */

if (welcome) {

  welcome.textContent = name;

}


/* NOME NO CABEÇALHO */

if (studentTopName) {

  studentTopName.textContent = name;

}


/* E-MAIL NO CABEÇALHO */

if (userName) {

  userName.textContent =
    user.email || "";

}


/* PRIMEIRA LETRA DO NOME */

if (studentAvatar) {

  studentAvatar.textContent =
    name
      .charAt(0)
      .toUpperCase();

}


  /* =====================================
     MATRÍCULAS ATIVAS
  ===================================== */

  const {
    data: enrollments,
    error: enrollmentError
  } = await sb
    .from("enrollments")
    .select(`
      id,
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
        Explore nossos cursos e escolha
        o próximo passo da sua jornada.
      </p>

      <a
        href="index.html#cursos"
        class="student-empty-button"
      >
        Ver cursos
        <span>→</span>
      </a>

    </div>

  `;

  return;
}


  /* =====================================
     CARREGAR TODOS OS CURSOS
  ===================================== */

  area.innerHTML = "";


  for (const enrollment of enrollments) {

    const course =
      enrollment.courses;


    if (!course) continue;


    await renderCourse(course);

  }

}


/* =====================================
   RENDERIZAR CURSO
===================================== */

async function renderCourse(course) {

  const {
    data: modules,
    error
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
        position,
        published
      )
    `)
    .eq("course_id", course.id)
    .order(
      "position",
      { ascending: true }
    );


  if (error) {

    console.error(
      "Erro ao carregar curso:",
      error
    );

    return;
  }


  /* =====================================
     ORGANIZAR MÓDULOS E AULAS
  ===================================== */

  const orderedModules =
    [...(modules || [])]
      .sort(
        (a, b) =>
          (a.position || 0) -
          (b.position || 0)
      );


  let totalLessons = 0;


  orderedModules.forEach(module => {

    module.lessons =
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


    totalLessons +=
      module.lessons.length;

  });


  /* =====================================
     CARD DO CURSO
  ===================================== */

  const courseCard =
    document.createElement("section");


  courseCard.className =
    "student-course-card";


  let modulesHtml = "";


  orderedModules.forEach(
    (module, moduleIndex) => {

      if (!module.lessons.length) {
        return;
      }


      const lessonsHtml =
        module.lessons
          .map(
            (lesson, lessonIndex) => `

              <a
                href="aula.html?id=${encodeURIComponent(
                  lesson.id
                )}"
                class="student-lesson"
              >

                <div class="student-lesson-number">
                  ${lessonIndex + 1}
                </div>


                <div class="student-lesson-info">

                  <strong>
                    ${escapeHtml(
                      lesson.title
                    )}
                  </strong>

                  <small>
                    Aula disponível
                  </small>

                </div>


                <span class="student-lesson-open">
                  Abrir
                  <span>→</span>
                </span>

              </a>

            `
          )
          .join("");


      modulesHtml += `

        <div class="student-module">

          <div class="student-module-header">

            <div>

              <span class="premium-eyebrow">
                MÓDULO ${moduleIndex + 1}
              </span>

              <h3>
                ${escapeHtml(
                  module.title
                )}
              </h3>

            </div>


            <span class="student-module-count">

              ${module.lessons.length}

              ${
                module.lessons.length === 1
                  ? "aula"
                  : "aulas"
              }

            </span>

          </div>


          <div class="student-lessons">

            ${lessonsHtml}

          </div>

        </div>

      `;

    }
  );


  /* =====================================
     CURSO SEM AULAS PUBLICADAS
  ===================================== */

  if (!modulesHtml) {

    modulesHtml = `

      <div class="student-course-preparing">

        <span class="preparing-icon">
          ◇
        </span>

        <div>

          <strong>
            Conteúdo em preparação
          </strong>

          <small>
            As aulas deste curso ainda
            não foram publicadas.
          </small>

        </div>

      </div>

    `;

  }


  /* =====================================
     HTML FINAL
  ===================================== */

  courseCard.innerHTML = `

    <div class="student-course-hero">

      <div class="student-course-icon">
        ◇
      </div>


      <div class="student-course-title">

        <span class="premium-eyebrow">
          MEU CURSO
        </span>

        <h2>
          ${escapeHtml(
            course.title
          )}
        </h2>

        ${
          course.description
            ? `
                <p>
                  ${escapeHtml(
                    course.description
                  )}
                </p>
              `
            : ""
        }

      </div>


      <div class="student-course-total">

        <strong>
          ${totalLessons}
        </strong>

        <span>
          ${
            totalLessons === 1
              ? "AULA"
              : "AULAS"
          }
        </span>

      </div>

    </div>


    <div class="student-course-content">

      <div class="student-course-content-head">

        <span class="premium-eyebrow">
          CONTEÚDO DO CURSO
        </span>

        <h2>
          Módulos e aulas
        </h2>

      </div>


      ${modulesHtml}

    </div>

  `;


  area.appendChild(courseCard);

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
   SEGURANÇA HTML
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
