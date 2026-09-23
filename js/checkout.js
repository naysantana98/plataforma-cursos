const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


const params =
  new URLSearchParams(window.location.search);

const courseId =
  params.get("course_id");


const courseTitle =
  document.getElementById("courseTitle");

const courseDescription =
  document.getElementById("courseDescription");

const coursePrice =
  document.getElementById("coursePrice");

const payButton =
  document.getElementById("payButton");

const checkoutMessage =
  document.getElementById("checkoutMessage");


async function initCheckout() {

  /* =====================================
     VERIFICAR CURSO
  ===================================== */

  if (!courseId) {

    checkoutMessage.textContent =
      "Curso não informado.";

    courseTitle.textContent =
      "Curso indisponível";

    courseDescription.textContent =
      "Volte para a página inicial e escolha um curso.";

    return;
  }


  /* =====================================
     VERIFICAR LOGIN
  ===================================== */

  const {
    data: { user }
  } = await sb.auth.getUser();


  if (!user) {

    const destination =
      `checkout.html?course_id=${encodeURIComponent(courseId)}`;

    location.href =
      `login.html?next=${encodeURIComponent(destination)}`;

    return;
  }


  /* =====================================
     BUSCAR CURSO
  ===================================== */

  const {
    data: course,
    error
  } = await sb
    .from("courses")
    .select(`
      id,
      title,
      description,
      price
    `)
    .eq("id", courseId)
    .maybeSingle();


  if (error || !course) {

    console.error(
      "Erro ao carregar curso:",
      error
    );

    courseTitle.textContent =
      "Curso indisponível";

    courseDescription.textContent =
      "Não foi possível carregar este curso.";

    checkoutMessage.textContent =
      "Verifique o curso selecionado e tente novamente.";

    return;
  }


  /* =====================================
     MOSTRAR DADOS
  ===================================== */

  courseTitle.textContent =
    course.title || "Curso";


  courseDescription.textContent =
    course.description ||
    "Curso online Academia Online.";


  const price =
    Number(course.price || 0);


  coursePrice.textContent =
    price.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );


  payButton.disabled = false;

}


payButton.addEventListener(
  "click",
  () => {

    checkoutMessage.textContent =
      "Pagamento será conectado ao Mercado Pago na próxima etapa.";

  }
);


initCheckout();
