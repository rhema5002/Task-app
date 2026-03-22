// 🔑 SUPABASE CONFIG
const SUPABASE_URL = "https://eslixudvrhnokslgehnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGl4dWR2cmhub2tzbGdlaG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTE1MjUsImV4cCI6MjA4OTMyNzUyNX0.hr4jab4Iyi7hFftEMIkkBDKm59f356MajJUNSznR1KY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= TOAST =================
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return alert(message);

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ================= AUTH =================
let isRegistering = false;

async function register() {
  if (isRegistering) return;
  isRegistering = true;

  const btn = document.querySelector("button");
  if (btn) btn.disabled = true;

  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  // ✅ VALIDATION
  if (!name || !email || !password) {
    showToast("Please fill all fields");
    isRegistering = false;
    if (btn) btn.disabled = false;
    return;
  }

  try {
    // ✅ CREATE USER
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    const user = data.user;

    if (!user) {
      throw new Error("User creation failed");
    }

    // ✅ SAVE PROFILE (ONLY ONCE)
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: user.id,
        full_name: name,
        email: email
      });

    if (profileError) throw profileError;

    // ✅ SUCCESS
    showToast("✅ Account created! Please login");

    setTimeout(() => {
      window.location.href = "index.html"; // go to login
    }, 1500);

  } catch (err) {
    console.error(err);
    showToast(err.message || "Something went wrong");
  }

  // ✅ RESET BUTTON
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
  document.querySelectorAll(".page").forEach(p => {
    p.style.display = "none";
  });

  const el = document.getElementById(page);

  if (el) {
    el.style.display = "block";
  }
}

// ================= TASK SYSTEM =================
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

// ================= LOADERS =================
async function loadAll() {
  await loadAvailable();
  await loadMyTasks();
  await loadAccepted();
}

let isLoading = false;

window.onload = async () => {
  if (isLoading) return;
  isLoading = true;

  showTab("available");

  await loadAll();
  await loadProfile();

  isLoading = false;
};

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

async function loadMyTasks() {
  const container = document.getElementById("myTasks");
  if (!container) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  // 🔥 FIX: stop if no user
  if (!user || !user.id) {
    console.log("No user logged in yet");
    container.innerHTML = "<p>Please login to view your tasks</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("creator_id", user.id);

  if (error) {
    console.log(error);
    container.innerHTML = "<p>Error loading tasks</p>";
    return;
  }

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

async function loadAccepted() {
  const container = document.getElementById("acceptedTasks");
  if (!container) return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user || !user.id) {
    container.innerHTML = "<p>Please login</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("accepted_by", user.id);

  if (error) {
    console.log(error);
    return;
  }

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

  // ---------------- SAFE CHECK ----------------
  if (!user || !user.id) {
    console.log("No user logged in");

    const nameEl = document.getElementById("profileName");
    const emailEl = document.getElementById("profileEmail");

    if (nameEl) nameEl.innerText = "Guest";
    if (emailEl) emailEl.innerText = "Please login";

    return;
  }

  // ---------------- PROFILE ELEMENTS ----------------
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const taskEl = document.getElementById("taskCount");
  const acceptedEl = document.getElementById("acceptedCount");

  // ---------------- BASIC USER INFO ----------------
  if (nameEl) nameEl.innerText = user.user_metadata?.full_name || "No Name";
  if (emailEl) emailEl.innerText = user.email || "";

  // ---------------- LOAD CREATED TASKS ----------------
  const { data: createdTasks, error: createdError } = await supabaseClient
    .from("tasks")
    .select("id")
    .eq("creator_id", user.id);

  if (createdError) console.log(createdError);

  // ---------------- LOAD ACCEPTED TASKS ----------------
  const { data: acceptedTasks, error: acceptedError } = await supabaseClient
    .from("tasks")
    .select("id")
    .eq("accepted_by", user.id);

  if (acceptedError) console.log(acceptedError);

  // ---------------- UPDATE UI ----------------
  if (taskEl) taskEl.innerText = createdTasks?.length || 0;
  if (acceptedEl) acceptedEl.innerText = acceptedTasks?.length || 0;
}

// ---------------- LOGOUT ----------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

// ---------------- AUTO LOAD ----------------
window.addEventListener("load", async () => {
  await loadProfile();
});

// ================= MODAL =================
async function openTaskModal(id) {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return showToast("Task not found");
  }

  // Save current task
  currentTask = data;

  // ---------------- UI ----------------
  document.getElementById("modalTitle").innerText = data.title;
  document.getElementById("modalDesc").innerText = data.description;

  // ✅ FIX: reward display
  document.getElementById("modalReward").innerText = data.reward || 0;

  // ✅ FIX: WhatsApp link (task poster number)
  const whatsappBtn = document.getElementById("whatsappBtn");

  if (data.whatsapp) {
    whatsappBtn.href = `https://wa.me/${data.whatsapp}`;
    whatsappBtn.style.display = "block";
  } else {
    whatsappBtn.href = "#";
    whatsappBtn.style.display = "none";
  }

  // Accept button
  document.getElementById("acceptBtn").onclick = () => acceptTask(id);

  // Show modal
  document.getElementById("taskModal").style.display = "flex";
}

async function openTaskModal(id) {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return showToast("Task not found");
  }

  // Save current task
  currentTask = data;

  // ---------------- UI ----------------
  document.getElementById("modalTitle").innerText = data.title;
  document.getElementById("modalDesc").innerText = data.description;

  // ✅ FIX: reward display
  document.getElementById("modalReward").innerText = data.reward || 0;

  // ✅ FIX: WhatsApp link (task poster number)
  const whatsappBtn = document.getElementById("whatsappBtn");

  if (data.whatsapp) {
    whatsappBtn.href = `https://wa.me/${data.whatsapp}`;
    whatsappBtn.style.display = "block";
  } else {
    whatsappBtn.href = "#";
    whatsappBtn.style.display = "none";
  }

  // Accept button
  document.getElementById("acceptBtn").onclick = () => acceptTask(id);

  // Show modal
  document.getElementById("taskModal").style.display = "flex";
}

window.addEventListener("click", function (e) {
  const modal = document.getElementById("taskModal");

  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// ================= ACCEPT =================
async function acceptTask(id) {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;

  if (!user) return showToast("Login required");

  const { data: task, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle(); // 🔥 IMPORTANT FIX

  if (error) {
    console.log(error);
    return showToast("Failed to load task");
  }

  if (!task) {
    return showToast("❌ Task no longer exists or already taken");
  }

  if (task.accepted_by) {
    return showToast("Already taken");
  }

  const { error: updateError } = await supabaseClient
    .from("tasks")
    .update({ accepted_by: user.id })
    .eq("id", id)
    .is("accepted_by", null);

  if (updateError) {
    console.log(updateError);
    return showToast("Failed to accept task");
  }

  showToast("🎉 Task accepted!");

  // SAFE OPEN
  if (task.whatsapp) {
    window.open(`https://wa.me/${task.whatsapp}`, "_blank");
  }

  loadAll();
}

// ================= INIT =================
window.onload = async () => {
  showTab("available");
  await loadAll();
  await loadProfile();
};


