const adminSb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (selector) => document.querySelector(selector);
const message = $("#message");

async function init() {
  const {
    data: { user },
    error: userError
  } = await adminSb.auth.getUser();

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

  if (coursesResult.error) {
    message.textContent = coursesResult.error.message;
    return;
  }

  if (studentsResult.error) {
    message.textContent = studentsResult.error.message;
    return;
  }

  if (enrollmentsResult.error) {
    message.textContent = enrollmentsResult.error.message;
    return;
  }

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
        <h3>
          ${
            enrollmentsResult.data?.filter(
              enrollment => enrollment.status === "active"
            ).length || 0
          }
        </h3>
        <p>Matrículas ativas</p>
      </article>
    `;
  }

  renderCourses(coursesResult.data || []);
  renderStudents(studentsResult.data || []);

  addCourseButtons();
}

function renderCourses(coursesData) {
  const courses = $("#courses");

  if (!courses) return;

  courses.innerHTML = coursesData.map(course => `
    <div class="list-row">
      <div>
        <b>${escapeHtml(course.title)}</b>
        <small>
          R$ ${Number(course.price || 0).toFixed(2)}
        </small>
      </div>

      <div class="course-actions">
        <button
          type="button"
          class="btn btn-outline edit-course"
          data-id="${course.id}"
        >
          Editar
        </button>

        <a
          class="btn btn-outline"
          href="admin-curso.html?id=${course.id}"
        >
          Conteúdo
        </a>

        <button
          type="button"
          class="btn btn-outline delete-course"
          data-id="${course.id}"
          data-title="${escapeHtml(course.title)}"
        >
          Excluir
        </button>
      </div>
    </div>
  `).join("");
}

function renderStudents(studentsData) {
  const students = $("#students");

  if (!students) return;

  students.innerHTML = studentsData.map(student => `
    <div class="list-row">
      <div>
        <b>${escapeHtml(student.full_name || "Sem nome")}</b>

        <small>
          ${student.active ? "🟢 Usuário ativo" : "🔴 Usuário inativo"}
        </small>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button
          type="button"
          class="btn btn-outline"
          onclick="toggleStudent('${student.id}', ${student.active})"
        >
          ${student.active ? "Desativar" : "Ativar"}
        </button>

        <button
          type="button"
          class="btn btn-outline"
          onclick="manageAccess('${student.id}')"
        >
          Acessos
        </button>
      </div>
    </div>
  `).join("");
}

function addCourseButtons() {
  document.querySelectorAll(".edit-course").forEach(button => {
    button.addEventListener("click", async () => {
      await editCourse(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-course").forEach(button => {
    button.addEventListener("click", async () => {
      await deleteCourse(
        button.dataset.id,
        button.dataset.title
      );
    });
  });
}

async function editCourse(courseId) {
  const { data: course, error } = await adminSb
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (error || !course) {
    message.textContent =
      error?.message || "Não foi possível carregar o curso.";
    return;
  }

  const newTitle = prompt(
    "Nome do curso:",
    course.title || ""
  );

  if (newTitle === null) return;

  const newSlug = prompt(
    "Slug:",
    course.slug || ""
  );

  if (newSlug === null) return;

  const newPrice = prompt(
    "Preço:",
    course.price ?? 0
  );

  if (newPrice === null) return;

  const newDescription = prompt(
    "Descrição:",
    course.description || ""
  );

  if (newDescription === null) return;

  if (!newTitle.trim()) {
    alert("O nome do curso não pode ficar vazio.");
    return;
  }

  if (!newSlug.trim()) {
    alert("O slug não pode ficar vazio.");
    return;
  }

  message.textContent = "Salvando alterações...";

  const { error: updateError } = await adminSb
    .from("courses")
    .update({
      title: newTitle.trim(),
      slug: newSlug.trim(),
      price: Number(newPrice || 0),
      description: newDescription.trim()
    })
    .eq("id", courseId);

  if (updateError) {
    message.textContent = updateError.message;
    return;
  }

  message.textContent = "Curso atualizado com sucesso!";

  await load();
}

async function deleteCourse(courseId, courseTitle) {
  const confirmed = confirm(
    `Tem certeza que deseja excluir o curso "${courseTitle}"?`
  );

  if (!confirmed) return;

  message.textContent = "Excluindo curso...";

  const { data: modules, error: modulesError } = await adminSb
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (modulesError) {
    message.textContent = modulesError.message;
    return;
  }

  const moduleIds = (modules || []).map(module => module.id);

  if (moduleIds.length > 0) {
    const { data: lessons, error: lessonsError } = await adminSb
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds);

    if (lessonsError) {
      message.textContent = lessonsError.message;
      return;
    }

    const lessonIds = (lessons || []).map(lesson => lesson.id);

    if (lessonIds.length > 0) {
      const { error: progressError } = await adminSb
        .from("lesson_progress")
        .delete()
        .in("lesson_id", lessonIds);

      if (progressError) {
        message.textContent = progressError.message;
        return;
      }

      const { error: deleteLessonsError } = await adminSb
        .from("lessons")
        .delete()
        .in("id", lessonIds);

      if (deleteLessonsError) {
        message.textContent = deleteLessonsError.message;
        return;
      }
    }

    const { error: deleteModulesError } = await adminSb
      .from("modules")
      .delete()
      .in("id", moduleIds);

    if (deleteModulesError) {
      message.textContent = deleteModulesError.message;
      return;
    }
  }

  const { error: enrollmentError } = await adminSb
    .from("enrollments")
    .delete()
    .eq("course_id", courseId);

  if (enrollmentError) {
    message.textContent = enrollmentError.message;
    return;
  }

  const { error: courseError } = await adminSb
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (courseError) {
    message.textContent = courseError.message;
    return;
  }

  message.textContent = "Curso excluído com sucesso!";

  await load();
}

const courseForm = $("#courseForm");

if (courseForm) {
  courseForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = $("#title").value.trim();
    const slug = $("#slug").value.trim();
    const price = Number($("#price").value || 0);
    const description = $("#description").value.trim();

    if (!title) {
      message.textContent =
        "Informe o nome do curso.";
      return;
    }

    if (!slug) {
      message.textContent =
        "Informe o slug do curso.";
      return;
    }

    message.textContent =
      "Cadastrando curso...";

    const { error } = await adminSb
      .from("courses")
      .insert({
        title,
        slug,
        price,
        description
      });

    if (error) {
      message.textContent = error.message;
      return;
    }

    message.textContent =
      "Curso cadastrado com sucesso!";

    courseForm.reset();

    await load();
  });
}

window.toggleStudent =
async function(studentId, currentStatus) {
  const action =
    currentStatus ? "desativar" : "ativar";

  const confirmed = confirm(
    `Deseja realmente ${action} este aluno?`
  );

  if (!confirmed) return;

  const { error } = await adminSb
    .from("profiles")
    .update({
      active: !currentStatus
    })
    .eq("id", studentId);

  if (error) {
    alert("Erro: " + error.message);
    return;
  }

  alert(
    currentStatus
      ? "Aluno desativado com sucesso!"
      : "Aluno ativado com sucesso!"
  );

  await load();
};

window.manageAccess =
async function(studentId) {
  const { data: courses, error: coursesError } =
    await adminSb
      .from("courses")
      .select("id, title")
      .order("title");

  if (coursesError) {
    alert(
      "Erro ao carregar cursos: " +
      coursesError.message
    );
    return;
  }

  if (!courses || courses.length === 0) {
    alert("Nenhum curso cadastrado.");
    return;
  }

  const {
    data: enrollments,
    error: enrollmentsError
  } = await adminSb
    .from("enrollments")
    .select("id, course_id, status")
    .eq("user_id", studentId);

  if (enrollmentsError) {
    alert(
      "Erro ao carregar acessos: " +
      enrollmentsError.message
    );
    return;
  }

  let html = `
    <h3>Gerenciar acessos</h3>

    <p style="margin-bottom:16px;">
      Marque os cursos que este aluno poderá acessar.
    </p>
  `;

  courses.forEach(course => {
    const active = enrollments?.find(
      enrollment =>
        enrollment.course_id === course.id &&
        enrollment.status === "active"
    );

    html += `
      <label
        style="
          display:flex;
          align-items:center;
          gap:10px;
          margin:12px 0;
        "
      >
        <input
          type="checkbox"
          value="${course.id}"
          ${active ? "checked" : ""}
        >

        <span>
          ${escapeHtml(course.title)}
        </span>
      </label>
    `;
  });

  html += `
    <div
      style="
        display:flex;
        gap:10px;
        margin-top:20px;
      "
    >
      <button
        id="cancelAccess"
        type="button"
        class="btn btn-outline"
        style="flex:1;"
      >
        Cancelar
      </button>

      <button
        id="saveAccess"
        type="button"
        class="btn"
        style="flex:1;"
      >
        Salvar acessos
      </button>
    </div>
  `;

  const box = document.createElement("div");

  box.className = "modal";

  box.innerHTML = `
    <div class="modal-content">
      ${html}
    </div>
  `;

  document.body.appendChild(box);

  const closeModal = () => {
    box.remove();
  };

  document.getElementById("cancelAccess").onclick =
    closeModal;

  box.onclick = event => {
    if (event.target === box) {
      closeModal();
    }
  };

  document.getElementById("saveAccess").onclick =
  async () => {
    const checkboxes = [
      ...box.querySelectorAll(
        'input[type="checkbox"]'
      )
    ];

    for (const checkbox of checkboxes) {
      const courseId = checkbox.value;

      const enrollment = enrollments?.find(
        item => item.course_id === courseId
      );

      if (checkbox.checked) {
        if (enrollment) {
          const { error } = await adminSb
            .from("enrollments")
            .update({
              status: "active"
            })
            .eq("id", enrollment.id);

          if (error) {
            alert(
              "Erro ao liberar acesso: " +
              error.message
            );
            return;
          }
        } else {
          const { error } = await adminSb
            .from("enrollments")
            .insert({
              user_id: studentId,
              course_id: courseId,
              status: "active"
            });

          if (error) {
            alert(
              "Erro ao liberar acesso: " +
              error.message
            );
            return;
          }
        }
      } else {
        if (enrollment) {
          const { error } = await adminSb
            .from("enrollments")
            .update({
              status: "inactive"
            })
            .eq("id", enrollment.id);

          if (error) {
            alert(
              "Erro ao remover acesso: " +
              error.message
            );
            return;
          }
        }
      }
    }

    closeModal();

    alert("Acessos atualizados com sucesso!");

    await load();
  };
};

const logoutButton = $("#logout");

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    async () => {
      await adminSb.auth.signOut();
      location.href = "index.html";
    }
  );
}

function escapeHtml(value) {
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
