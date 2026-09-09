const sb2 = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const box = document.getElementById("lesson");

async function initLesson() {
  const { data: { user } } = await sb2.auth.getUser();
  if (!user) return location.href="login.html";

  const id = new URLSearchParams(location.search).get("id");
  if (!id) return box.innerHTML="<h1>Aula não encontrada.</h1>";

  const { data: enrollment } = await sb2.from("enrollments").select("course_id").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
  if (!enrollment) return box.innerHTML="<h1>Acesso não liberado.</h1><p>Seu usuário não possui matrícula ativa.</p>";

  const { data: lesson, error } = await sb2.from("lessons").select("*,modules(title,course_id)").eq("id",id).single();
  if (error || !lesson || lesson.modules.course_id !== enrollment.course_id) return box.innerHTML="<h1>Aula indisponível.</h1>";

  const { data: prog } = await sb2.from("lesson_progress").select("completed").eq("user_id",user.id).eq("lesson_id",id).maybeSingle();

  box.innerHTML = `<span class="eyebrow">${escapeHtml(lesson.modules.title)}</span>
    <h1>${escapeHtml(lesson.title)}</h1>
    <p class="muted-text">${escapeHtml(lesson.description || "")}</p>
    <div class="video">${lesson.video_url ? `<iframe width="100%" height="100%" style="border:0;border-radius:18px" src="${escapeAttr(lesson.video_url)}" allowfullscreen></iframe>` : "Vídeo da aula"}</div>
    <button class="btn complete" id="complete">${prog?.completed ? "✓ Aula concluída" : "Marcar como concluída"}</button>
    <div id="lessonMsg" class="message"></div>`;

  document.getElementById("complete").onclick = async () => {
    const { error } = await sb2.from("lesson_progress").upsert({user_id:user.id, lesson_id:id, completed:true, completed_at:new Date().toISOString()},{onConflict:"user_id,lesson_id"});
    document.getElementById("lessonMsg").textContent = error ? error.message : "Aula marcada como concluída!";
  };
}
document.getElementById("logout").onclick=async()=>{await sb2.auth.signOut();location.href="index.html"};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return String(s).replace(/"/g,"&quot;")}
initLesson();
