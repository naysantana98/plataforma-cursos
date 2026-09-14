const adminSb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = selector =>
  document.querySelector(selector);

const message = $("#message");

const editCourseModal =
  $("#editCourseModal");

const editCourseForm =
  $("#editCourseForm");


async function init() {

  const {
    data: { user },
    error: userError
  } = await adminSb.auth.getUser();

  if (userError || !user) {
    location.href = "login.html";
    return;
  }

  const {
    data: profile,
    error: profileError
  } = await adminSb
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin"
  ) {

    document.body.innerHTML = `
      <main class="auth-page">

        <div class="auth-box">

          <h1>Acesso negado</h1>

          <p>
            Esta área é exclusiva
            para administradores.
          </p>

        </div>

      </main>
    `;

    return;
  }

  await load();
}


async function load() {

  const coursesResult =
    await adminSb
      .from("courses")
      .select("*")
      .order(
        "created_at",
        { ascending: false }
      );

  const studentsResult =
    await adminSb
      .from("profiles")
      .select(
        "id, full_name, role, active, created_at"
      )
      .eq("role", "student")
      .order(
        "created_at",
        { ascending: false }
      );

  const enrollmentsResult =
    await adminSb
      .from("enrollments")
      .select("id, status");


  if (coursesResult.error) {
    message.textContent =
      coursesResult.error.message;

    return;
  }

  if (studentsResult.error) {
    message.textContent =
      studentsResult.error.message;

    return;
  }

  if (enrollmentsResult.error) {
    message.textContent =
      enrollmentsResult.error.message;

    return;
  }


  renderStats(
    coursesResult.data || [],
    studentsResult.data || [],
    enrollmentsResult.data || []
  );

  renderCourses(
    coursesResult.data || []
  );

  renderStudents(
    studentsResult.data || []
  );

  addCourseButtons();
}


function renderStats(
  courses,
  students,
  enrollments
) {

  const stats = $("#stats");

  if (!stats) return;

  const activeEnrollments =
    enrollments.filter(
      item =>
        item.status === "active"
    ).length;

  stats.innerHTML = `

    <article>

      <h3>
        ${courses.length}
      </h3>

      <p>
        Cursos
      </p>

    </article>


    <article>

      <h3>
        ${students.length}
      </h3>

      <p>
        Alunos
      </p>

    </article>


    <article>

      <h3>
        ${activeEnrollments}
      </h3>

      <p>
        Matrículas ativas
      </p>

    </article>

  `;
}


function renderCourses(coursesData) {

  const courses = $("#courses");

  if (!courses) return;


  courses.innerHTML =
    coursesData
      .map(course => `

        <div class="list-row">

          <div>

            <b>
              ${escapeHtml(course.title)}
            </b>

            <small>
              R$
              ${Number(
                course.price || 0
              ).toFixed(2)}
            </small>

          </div>


          <div class="course-actions">

            <button
              type="button"
              class="
                btn
                btn-outline
                edit-course
              "
              data-id="${course.id}"
            >
              Editar
            </button>


            <a
              class="btn btn-outline"
              href="
                href="admin-curso.html?id=${course.id}"
                ${course.id}
              "
            >
              Conteúdo
            </a>


            <button
              type="button"
              class="
                btn
                btn-outline
                delete-course
              "
              data-id="${course.id}"
              data-title="
                ${escapeHtml(
                  course.title
                )}
              "
            >
              Excluir
            </button>

          </div>

        </div>

      `)
      .join("");
}


function renderStudents(
  studentsData
) {

  const students =
    $("#students");

  if (!students) return;


  students.innerHTML =
    studentsData
      .map(student => `

        <div class="list-row">

          <div>

            <b>
              ${
                escapeHtml(
                  student.full_name ||
                  "Sem nome"
                )
              }
            </b>

            <small>

              ${
                student.active
                  ? "🟢 Usuário ativo"
                  : "🔴 Usuário inativo"
              }

            </small>

          </div>


          <div class="student-actions">

            <button
              type="button"
              class="btn btn-outline"
              onclick="
                toggleStudent(
                  '${student.id}',
                  ${student.active}
                )
              "
            >

              ${
                student.active
                  ? "Desativar"
                  : "Ativar"
              }

            </button>


            <button
              type="button"
              class="btn btn-outline"
              onclick="
                manageAccess(
                  '${student.id}'
                )
              "
            >
              Acessos
            </button>

          </div>

        </div>

      `)
      .join("");
}


function addCourseButtons() {

  document
    .querySelectorAll(
      ".edit-course"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          await openEditCourse(
            button.dataset.id
          );

        };

    });


  document
    .querySelectorAll(
      ".delete-course"
    )
    .forEach(button => {

      button.onclick =
        async () => {

          await deleteCourse(
            button.dataset.id,
            button.dataset.title
          );

        };

    });
}


/* ========================
   ABRIR MODAL EDITAR CURSO
======================== */

async function openEditCourse(
  courseId
) {

  const {
    data: course,
    error
  } = await adminSb
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();


  if (error || !course) {

    message.textContent =
      error?.message ||
      "Não foi possível carregar o curso.";

    return;
  }


  $("#editCourseId").value =
    course.id;

  $("#editTitle").value =
    course.title || "";

  $("#editSlug").value =
    course.slug || "";

  $("#editPrice").value =
    course.price ?? 0;

  $("#editDescription").value =
    course.description || "";


  editCourseModal.style.display =
    "flex";
}


/* ========================
   FECHAR MODAL
======================== */

function closeEditCourseModal() {

  editCourseModal.style.display =
    "none";

  editCourseForm.reset();
}


$("#closeEditCourse").onclick =
  closeEditCourseModal;


$("#cancelEditCourse").onclick =
  closeEditCourseModal;


editCourseModal.onclick =
  event => {

    if (
      event.target ===
      editCourseModal
    ) {

      closeEditCourseModal();

    }

  };


/* ========================
   SALVAR EDIÇÃO
======================== */

editCourseForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const courseId =
      $("#editCourseId").value;


    const title =
      $("#editTitle")
        .value
        .trim();


    const slug =
      $("#editSlug")
        .value
        .trim();


    const price =
      Number(
        $("#editPrice")
          .value || 0
      );


    const description =
      $("#editDescription")
        .value
        .trim();


    if (!title) {

      alert(
        "Informe o nome do curso."
      );

      return;
    }


    if (!slug) {

      alert(
        "Informe o slug."
      );

      return;
    }


    const {
      error
    } = await adminSb
      .from("courses")
      .update({

        title,
        slug,
        price,
        description

      })
      .eq("id", courseId);


    if (error) {

      alert(
        "Erro ao salvar: " +
        error.message
      );

      return;
    }


    closeEditCourseModal();


    message.textContent =
      "Curso atualizado com sucesso!";


    await load();
  }
);


/* ========================
   EXCLUIR CURSO
======================== */

async function deleteCourse(
  courseId,
  courseTitle
) {

  const confirmed =
    confirm(
      `Tem certeza que deseja excluir o curso "${courseTitle}"?`
    );


  if (!confirmed) return;


  message.textContent =
    "Excluindo curso...";


  const {
    data: modules,
    error: modulesError
  } = await adminSb
    .from("modules")
    .select("id")
    .eq("course_id", courseId);


  if (modulesError) {

    message.textContent =
      modulesError.message;

    return;
  }


  const moduleIds =
    (modules || [])
      .map(module => module.id);


  if (moduleIds.length) {

    const {
      data: lessons,
      error: lessonsError
    } = await adminSb
      .from("lessons")
      .select("id")
      .in(
        "module_id",
        moduleIds
      );


    if (lessonsError) {

      message.textContent =
        lessonsError.message;

      return;
    }


    const lessonIds =
      (lessons || [])
        .map(lesson => lesson.id);


    if (lessonIds.length) {

      const {
        error: progressError
      } = await adminSb
        .from("lesson_progress")
        .delete()
        .in(
          "lesson_id",
          lessonIds
        );


      if (progressError) {

        message.textContent =
          progressError.message;

        return;
      }


      const {
        error: lessonsDeleteError
      } = await adminSb
        .from("lessons")
        .delete()
        .in(
          "id",
          lessonIds
        );


      if (lessonsDeleteError) {

        message.textContent =
          lessonsDeleteError.message;

        return;
      }
    }


    const {
      error: modulesDeleteError
    } = await adminSb
      .from("modules")
      .delete()
      .in(
        "id",
        moduleIds
      );


    if (modulesDeleteError) {

      message.textContent =
        modulesDeleteError.message;

      return;
    }
  }


  const {
    error: enrollmentError
  } = await adminSb
    .from("enrollments")
    .delete()
    .eq(
      "course_id",
      courseId
    );


  if (enrollmentError) {

    message.textContent =
      enrollmentError.message;

    return;
  }


  const {
    error: courseError
  } = await adminSb
    .from("courses")
    .delete()
    .eq(
      "id",
      courseId
    );


  if (courseError) {

    message.textContent =
      courseError.message;

    return;
  }


  message.textContent =
    "Curso excluído com sucesso!";


  await load();
}


/* ========================
   CADASTRAR CURSO
======================== */

const courseForm =
  $("#courseForm");


courseForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const title =
      $("#title")
        .value
        .trim();


    const slug =
      $("#slug")
        .value
        .trim();


    const price =
      Number(
        $("#price")
          .value || 0
      );


    const description =
      $("#description")
        .value
        .trim();


    if (!title) {

      message.textContent =
        "Informe o nome do curso.";

      return;
    }


    if (!slug) {

      message.textContent =
        "Informe o slug.";

      return;
    }


    message.textContent =
      "Cadastrando curso...";


    const {
      error
    } = await adminSb
      .from("courses")
      .insert({

        title,
        slug,
        price,
        description

      });


    if (error) {

      message.textContent =
        error.message;

      return;
    }


    message.textContent =
      "Curso cadastrado com sucesso!";


    courseForm.reset();


    await load();
  }
);


/* ========================
   ATIVAR / DESATIVAR ALUNO
======================== */

window.toggleStudent =
async function(
  studentId,
  currentStatus
) {

  const action =
    currentStatus
      ? "desativar"
      : "ativar";


  const confirmed =
    confirm(
      `Deseja realmente ${action} este aluno?`
    );


  if (!confirmed) return;


  const {
    error
  } = await adminSb
    .from("profiles")
    .update({

      active:
        !currentStatus

    })
    .eq(
      "id",
      studentId
    );


  if (error) {

    alert(
      "Erro: " +
      error.message
    );

    return;
  }


  await load();
};


/* ========================
   ACESSOS DO ALUNO
======================== */

window.manageAccess =
async function(studentId) {

  const {
    data: courses,
    error: coursesError
  } = await adminSb
    .from("courses")
    .select("id, title")
    .order("title");


  if (coursesError) {

    alert(
      coursesError.message
    );

    return;
  }


  const {
    data: enrollments,
    error: enrollmentsError
  } = await adminSb
    .from("enrollments")
    .select(
      "id, course_id, status"
    )
    .eq(
      "user_id",
      studentId
    );


  if (enrollmentsError) {

    alert(
      enrollmentsError.message
    );

    return;
  }


  let html = `

    <h3>
      Gerenciar acessos
    </h3>

    <p>
      Marque os cursos que este aluno poderá acessar.
    </p>

  `;


  courses.forEach(course => {

    const active =
      enrollments?.find(
        enrollment =>

          enrollment.course_id ===
            course.id

          &&

          enrollment.status ===
            "active"
      );


    html += `

      <label class="access-option">

        <input
          type="checkbox"
          value="${course.id}"
          ${active ? "checked" : ""}
        >

        <span>
          ${escapeHtml(
            course.title
          )}
        </span>

      </label>

    `;

  });


  html += `

    <div class="modal-actions">

      <button
        id="cancelAccess"
        type="button"
        class="btn btn-outline"
      >
        Cancelar
      </button>

      <button
        id="saveAccess"
        type="button"
        class="btn"
      >
        Salvar acessos
      </button>

    </div>

  `;


  const box =
    document.createElement("div");


  box.className =
    "modal";


  box.innerHTML = `

    <div class="modal-content">

      ${html}

    </div>

  `;


  document.body.appendChild(box);


  const close =
    () => box.remove();


  $("#cancelAccess").onclick =
    close;


  box.onclick =
    event => {

      if (
        event.target === box
      ) {

        close();

      }

    };


  $("#saveAccess").onclick =
  async () => {

    const checkboxes =
      [
        ...box.querySelectorAll(
          'input[type="checkbox"]'
        )
      ];


    for (
      const checkbox
      of checkboxes
    ) {

      const courseId =
        checkbox.value;


      const enrollment =
        enrollments?.find(
          item =>
            item.course_id ===
            courseId
        );


      if (
        checkbox.checked
      ) {

        if (enrollment) {

          const {
            error
          } = await adminSb
            .from("enrollments")
            .update({

              status:
                "active"

            })
            .eq(
              "id",
              enrollment.id
            );


          if (error) {

            alert(
              error.message
            );

            return;
          }

        } else {

          const {
            error
          } = await adminSb
            .from("enrollments")
            .insert({

              user_id:
                studentId,

              course_id:
                courseId,

              status:
                "active"

            });


          if (error) {

            alert(
              error.message
            );

            return;
          }
        }

      } else {

        if (enrollment) {

          const {
            error
          } = await adminSb
            .from("enrollments")
            .update({

              status:
                "inactive"

            })
            .eq(
              "id",
              enrollment.id
            );


          if (error) {

            alert(
              error.message
            );

            return;
          }
        }
      }
    }


    close();


    message.textContent =
      "Acessos atualizados com sucesso!";


    await load();
  };
};


/* ========================
   LOGOUT
======================== */

$("#logout").onclick =
async () => {

  await adminSb.auth.signOut();

  location.href =
    "index.html";
};


/* ========================
   SEGURANÇA HTML
======================== */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /[&<>"']/g,
      char => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[char])
    );
}


init();
