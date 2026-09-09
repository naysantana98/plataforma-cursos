const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const area = document.getElementById("courseArea");
const msg = document.getElementById("message");

async function init() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return location.href = "login.html";

  const name = user.user_metadata?.full_name || user.email.split("@")[0];
  document.getElementById("welcome").textContent = name;
  document.getElementById("userName").textContent = user.email;

  const { data: enrollments, error } = await sb.from("enrollments")
    .select("course_id, status, courses(id,title,description)")
    .eq("user_id", user.id).eq("status","active");

  if (error) return msg.textContent = error.message;
  if (!enrollments?.length) {
    area.innerHTML = `<div class="module"><div class="module-head">Nenhum curso liberado</div><div class="lesson-row">Após a confirmação do pagamento, seu curso aparecerá aqui.</div></div>`;
    return;
  }

  const course = enrollments[0].courses;
  const { data: modules, error: me } = await sb.from("modules")
    .select("id,title,position,lessons(id,title,description,video_url,position)")
    .eq("course_id", course.id).order("position");
  if (me) return msg.textContent = me.message;

  const { data: progress } = await sb.from("lesson_progress")
    .select("lesson_id,completed").eq("user_id", user.id);

  const done = new Set((progress || []).filter(x => x.completed).map(x => x.lesson_id));
  let html = `<div><span class="eyebrow">MEU CURSO</span><h2>${escapeHtml(course.title)}</h2><p class="muted-text">${escapeHtml(course.description || "")}</p></div>`;

  for (const m of modules || []) {
    html += `<div class="module"><div class="module-head">${escapeHtml(m.title)}</div>`;
    for (const l of (m.lessons || []).sort((a,b)=>a.position-b.position)) {
      html += `<div class="lesson-row ${done.has(l.id) ? "done" : ""}">
        <div><strong>${escapeHtml(l.title)}</strong><br><small>${done.has(l.id) ? "Concluída" : "Aula disponível"}</small></div>
        <a href="aula.html?id=${l.id}">Abrir →</a>
      </div>`;
    }
    html += `</div>`;
  }
  area.innerHTML = html;
}

document.getElementById("logout").onclick = async () => { await sb.auth.signOut(); location.href="index.html"; };
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
init();
