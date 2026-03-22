// 🔑 SUPABASE CONFIG
const SUPABASE_URL = "https://hsakisqsisenojfcnjdh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYWtpc3FzaXNlbm9qZmNuamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODU2OTksImV4cCI6MjA4OTY2MTY5OX0.XMen3pFzOu3r1YPoE4au1ez1DLFIG_XJeylpFWNR8xM";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= GLOBAL STATE =================
let isRegistering = false;
let currentTask = null;

// ================= TOAST =================
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return alert(message);

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ================= AUTH =================
async function register() {
  if (isRegistering) return;
  isRegistering = true;

  const btn = document.querySelector("button");
  if (btn) btn.disabled = true;

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!name || !email || !password) {
    showToast("Please fill all fields");
    isRegistering = false;
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error("User creation failed");

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: user.id,
        full_name: name,
        email
      });

    if (profileError) throw profileError;

    showToast("✅ Account created! Please login");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);

  } catch (err) {
    showToast(err.message);
  }

  isRegistering = false;
  if (btn) btn.disabled = false;
}

async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) return showToast(error.message);

  window.location.href = "dashboard.html";
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// ================= UI =================
function showTab(page) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(page)?.style.display = "block";
}

// ================= TASK CREATE =================
async function createTask() {
  const title = document.getElementById("title")?.value;
  const description = document.getElementById("description")?.value;
  const reward = document.getElementById("reward")?.value;
  const whatsapp = document.getElementById("whatsapp")?.value;

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) return showToast("Login required");

  const { count } = await supabaseClient
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id);

  if (count >= 5) return showToast("Max 5 tasks allowed");

  const { error } = await supabaseClient.from("tasks").insert({
    title,
    description,
    reward,
    whatsapp,
    creator_id: user.id
  });

  if (error) return showToast(error.message);

  showToast("Task created!");
  loadAll();
  showTab("available");
}

// ================= LOAD ALL =================
async function loadAll() {
  await loadAvailable();
  await loadMyTasks();
  await loadAccepted();
}

// ================= INIT =================
window.addEventListener("load", async () => {
  showTab("available");
  await loadAll();
  await loadProfile();
});

// ================= AVAILABLE TASKS =================
async function loadAvailable() {
  const container = document.getElementById("available");
  if (!container) return;

  const { data } = await supabaseClient
    .from("tasks")
    .select("*")
    .is("accepted_by", null);

  container.innerHTML = "";

  if (!data?.length) {
    container.innerHTML = "<p>No tasks yet</p>";
    return;
  }

  data.forEach(task => {
    container.innerHTML += `
      <div class="task" onclick="openTaskModal('${task.id}')">
        <h3>${task.title}</h3>
        <p>Tap to view</p>
      </div>
    `;
  });
}

// ================= MY TASKS =================
async function loadMyTasks() {
  const container = document.getElementById("myTasks");
  if (!container) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) {
    container.innerHTML = "<p>Login required</p>";
    return;
  }

  const { data } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("creator_id", user.id);

  container.innerHTML = "";

  data?.forEach(task => {
    container.innerHTML += `
      <div class="task">
        <h3>${task.title}</h3>
        <p>${task.description}</p>
        <p>₦${task.reward}</p>
      </div>
    `;
  });
}

// ================= ACCEPTED =================
async function loadAccepted() {
  const container = document.getElementById("acceptedTasks");
  if (!container) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) {
    container.innerHTML = "<p>Login required</p>";
    return;
  }

  const { data } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("accepted_by", user.id);

  container.innerHTML = "";

  data?.forEach(task => {
    container.innerHTML += `
      <div class="task" onclick="openTaskModal('${task.id}')">
        <h3>${task.title}</h3>
        <p>${task.description}</p>
        <p>₦${task.reward}</p>
      </div>
    `;
  });
}

// ================= PROFILE =================
async function loadProfile() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) return;

  document.getElementById("profileName").innerText =
    user.user_metadata?.full_name || "No Name";

  document.getElementById("profileEmail").innerText =
    user.email;

  const { data: created } = await supabaseClient
    .from("tasks")
    .select("id")
    .eq("creator_id", user.id);

  const { data: accepted } = await supabaseClient
    .from("tasks")
    .select("id")
    .eq("accepted_by", user.id);

  document.getElementById("taskCount").innerText = created?.length || 0;
  document.getElementById("acceptedCount").innerText = accepted?.length || 0;
}

// ================= MODAL =================
function openModal() {
  document.getElementById("taskModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("taskModal").style.display = "none";
}

async function openTaskModal(id) {
  const { data } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return showToast("Task not found");

  currentTask = data;

  document.getElementById("modalTitle").innerText = data.title;
  document.getElementById("modalDesc").innerText = data.description;
  document.getElementById("modalReward").innerText = data.reward || 0;

  const wa = document.getElementById("whatsappBtn");

  if (data.whatsapp) {
    wa.href = `https://wa.me/${data.whatsapp}`;
    wa.style.display = "block";
  } else {
    wa.style.display = "none";
  }

  document.getElementById("acceptBtn").onclick = () => acceptTask(id);

  document.getElementById("taskModal").style.display = "flex";
}

// close on outside click
window.addEventListener("click", (e) => {
  const modal = document.getElementById("taskModal");
  if (e.target === modal) modal.style.display = "none";
});

// ================= ACCEPT TASK =================
async function acceptTask(id) {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) return showToast("Login required");

  const { data: task } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!task) return showToast("Task not found");

  if (task.accepted_by) return showToast("Already taken");

  const { error } = await supabaseClient
    .from("tasks")
    .update({ accepted_by: user.id })
    .eq("id", id)
    .is("accepted_by", null);

  if (error) return showToast("Failed to accept task");

  showToast("🎉 Task accepted!");

  if (task.whatsapp) {
    window.open(`https://wa.me/${task.whatsapp}`, "_blank");
  }

  loadAll();
}