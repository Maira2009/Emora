const supabaseConfig = window.emoraSupabaseConfig || {};
const moods = [
  { name: "Heartbroken", id: "heartbroken", tone: "#ff5ea8", aura: "rainy neon" },
  { name: "Sad", id: "sad", tone: "#5f8dff", aura: "soft rain" },
  { name: "Anxious", id: "anxious", tone: "#7a8cff", aura: "slow blue glow" },
  { name: "Angry", id: "angry", tone: "#ff625d", aura: "ember pulse" },
  { name: "Overthinking", id: "overthinking", tone: "#38d8ff", aura: "soft static" },
  { name: "Burned Out", id: "burned-out", tone: "#8b7bff", aura: "quiet fog" },
  { name: "Lonely", id: "lonely", tone: "#7da8ff", aura: "moonlit room" },
  { name: "Happy", id: "happy", tone: "#ffd36d", aura: "sunrise sparkles" },
  { name: "Calm", id: "calm", tone: "#6fffe9", aura: "galaxy drift" },
  { name: "Motivated", id: "motivated", tone: "#68f8c0", aura: "electric dawn" },
];

const reasons = {
  heartbroken: ["Breakup", "Missing them", "No-contact", "Betrayal", "Loneliness"],
  sad: ["Relationship", "Family", "Friends", "Studies", "Loneliness", "Self-esteem", "Unknown reason"],
  anxious: ["Future", "Social anxiety", "Exams", "Overthinking", "Health", "Relationships"],
  angry: ["Family conflict", "Relationship", "Stress", "Work/Studies", "Betrayal", "Frustration"],
  "burned-out": ["Studies", "Work", "Social overload", "Sleep debt", "Too many demands"],
  overthinking: ["Relationship", "Future", "Exams", "Self-esteem", "Unknown reason"],
  lonely: ["After relationship", "Friends", "New place", "Feeling unseen", "Night thoughts"],
  happy: ["Personal win", "Friends", "Love", "Creative energy", "Peaceful day"],
  calm: ["After rest", "Meditation", "Music", "Nature", "Quiet evening"],
  motivated: ["Studies", "Fitness", "Glow up", "Creative goal", "Career"],
};

const state = {
  user: null,
  authReady: true,
  guestName: localStorage.getItem("emora.guestName") || "Maya",
  selectedMood: moods[0],
  selectedReason: "Breakup",
  preferences: load("emora.preferences", {
    feeling: "Heavy",
    comfort: "Music",
    stress: "Overthinking",
    goal: "Feel calmer",
  }),
  memory: load("emora.memory", {
    history: [],
    calmingWins: {},
    streak: 1,
  }),
};

const screen = document.querySelector(".app-screen");
const flowLayers = document.querySelectorAll(".flow-layer");
const appLayer = document.querySelector(".app-layer");
const moodPicker = document.querySelector("#moodPicker");
const reasonPicker = document.querySelector("#reasonPicker");
const homeMood = document.querySelector("#homeMood");
const heroMessage = document.querySelector("#heroMessage");
const heroSubtext = document.querySelector("#heroSubtext");
const contextPrompt = document.querySelector("#contextPrompt");
const journalPrompt = document.querySelector("#journalPrompt");
const tabScreens = document.querySelectorAll(".tab-screen");
const bottomNavButtons = document.querySelectorAll(".bottom-nav [data-tab-target]");
const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const aiOrb = document.querySelector("#aiOrb");
const primaryModeButton = document.querySelector("#primaryModeButton");
const closeExMode = document.querySelector("#closeExMode");
const exMode = document.querySelector("#exMode");
const panicButton = document.querySelector("#panicButton");
const relaxNow = document.querySelector("#relaxNow");
const noContactTimer = document.querySelector("#noContactTimer");
const guestLogin = document.querySelector("#guestLogin");
const guestName = document.querySelector("#guestName");
const authMessage = document.querySelector("#authMessage");
const saveOnboarding = document.querySelector("#saveOnboarding");
const openHome = document.querySelector("#openHome");
const memoryInsight = document.querySelector("#memoryInsight");
const streakValue = document.querySelector("#streakValue");
const enterButton = document.querySelector("#enterButton");
const experienceSheet = document.querySelector("#experienceSheet");
const experienceKicker = document.querySelector("#experienceKicker");
const experienceTitle = document.querySelector("#experienceTitle");
const experienceBody = document.querySelector("#experienceBody");
const closeExperience = document.querySelector("#closeExperience");
const toast = document.querySelector("#toast");
const miniPlayer = document.querySelector("#miniPlayer");
const playPause = document.querySelector("#playPause");
const trackTitle = document.querySelector("#trackTitle");
const trackMood = document.querySelector("#trackMood");
const volumeControl = document.querySelector("#volumeControl");

let timerSeconds = 60 * 60 - 1;
let audioContext;
let masterGain;
let ambienceNodes = [];
let isPlaying = false;
let breathingInterval;
let ambienceArmed = false;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
  authMessage.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], {
    duration: 260,
    easing: "ease-out",
  });
}

async function saveProfile() {
  const payload = {
    guestName: state.guestName,
    preferences: state.preferences,
    mood: state.selectedMood.name,
    reason: state.selectedReason,
    memory: state.memory,
    updatedAt: new Date().toISOString(),
  };
  save("emora.profile", payload);

  if (supabaseConfig.url && supabaseConfig.anonKey) {
    await fetch(`${supabaseConfig.url}/rest/v1/emora_profiles`, {
      method: "POST",
      headers: {
        apikey: supabaseConfig.anonKey,
        authorization: `Bearer ${supabaseConfig.anonKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ user_id: state.guestName || "guest", profile: payload }),
    }).catch(() => {});
  }
}

function setFlow(name) {
  flowLayers.forEach((layer) => layer.classList.toggle("active", layer.dataset.flow === name));
  appLayer.classList.toggle("active", name === "app");
  if (window.location.hash !== `#${name}`) {
    history.replaceState(null, "", `#${name}`);
  }
}

function setTab(name) {
  tabScreens.forEach((screenEl) => screenEl.classList.toggle("active", screenEl.dataset.tab === name));
  bottomNavButtons.forEach((button) => button.classList.toggle("active", button.dataset.tabTarget === name));
  if (name === "ai") renderChatHistory();
}

function renderMoodPicker() {
  moodPicker.innerHTML = moods
    .map((mood) => `
      <a class="mood-choice ${mood.id === state.selectedMood.id ? "active" : ""}" href="#reason" data-mood-id="${mood.id}" style="--tone:${mood.tone}">
        <strong>${mood.name}</strong>
        <span>${mood.aura}</span>
      </a>
    `)
    .join("");
}

function renderReasonPicker() {
  reasonPicker.innerHTML = (reasons[state.selectedMood.id] || ["Unknown reason"])
    .map((reason) => `
      <a class="mood-choice reason-choice ${reason === state.selectedReason ? "active" : ""}" href="#app" data-reason="${reason}" style="--tone:${state.selectedMood.tone}">
        <strong>${reason}</strong>
        <span>${reasonSupportLabel(reason)}</span>
      </a>
    `)
    .join("");
}

function reasonSupportLabel(reason) {
  if (isRelationshipContext(reason)) return "emotional protection";
  if (/exam|studies|work/i.test(reason)) return "focus support";
  if (/family|conflict/i.test(reason)) return "grounding";
  if (/lonely|unseen/i.test(reason)) return "comfort";
  return "personalized care";
}

function isRelationshipContext(reason = state.selectedReason) {
  return /relationship|breakup|missing|no-contact|after relationship|heartbreak|betrayal/i.test(`${state.selectedMood.name} ${reason}`);
}

function makePlan() {
  const comfort = state.preferences.comfort.toLowerCase();
  const stress = state.preferences.stress.toLowerCase();
  const goal = state.preferences.goal.toLowerCase();
  const mood = state.selectedMood.name;
  const reason = state.selectedReason;

  if (isRelationshipContext()) {
    return {
      message: "Protect your peace tonight.",
      subtext: `Because this is ${reason.toLowerCase()}, Emora will prioritize no-contact, ${comfort}, and emotional journaling.`,
      primary: "Don't Text Your Ex",
      prompt: `I remember ${state.preferences.comfort.toLowerCase()} helps you. Want calming music before you decide anything?`,
      journal: "Dump the message here. Then write what your future self deserves.",
      tool: "ex",
    };
  }
  if (/exam|studies|work/i.test(reason)) {
    return {
      message: "Make the next hour smaller.",
      subtext: `Study stress needs focus, not pressure. Start with breathing, then a calm timer.`,
      primary: "Focus calm timer",
      prompt: "Want a 25-minute focus sprint with anxiety breathing first?",
      journal: "What is the smallest study step that would count as progress?",
      tool: "heal",
    };
  }
  if (/family|conflict|frustration/i.test(reason)) {
    return {
      message: "Let your body cool first.",
      subtext: "Family stress gets grounding, breathwork, and a private boundary journal.",
      primary: "Grounding reset",
      prompt: "Want a short grounding exercise before replying to anyone?",
      journal: "What boundary is this feeling trying to protect?",
      tool: "heal",
    };
  }
  if (/lonely|unseen|friends/i.test(reason)) {
    return {
      message: "You need gentle connection.",
      subtext: `Since ${comfort} comforts you, Emora will pair it with a walk and soft AI support.`,
      primary: "Comfort AI",
      prompt: "Want me to help you send a low-pressure check-in?",
      journal: "Who feels safe enough to receive a small honest message?",
      tool: "ai",
    };
  }
  if (mood === "Motivated" || goal.includes("motivated")) {
    return {
      message: "Turn the spark into one win.",
      subtext: "Your home is set to energetic support, small challenges, and XP rewards.",
      primary: "Start sprint",
      prompt: "Want one clear next step and a reward after?",
      journal: "What would make the next 25 minutes a win?",
      tool: "heal",
    };
  }
  return {
    message: "Your emotions matter.",
    subtext: `Because you mentioned ${stress}, Emora will keep recommendations soft and practical.`,
    primary: "Breathe",
    prompt: "Want a 30-second reset?",
    journal: "What does this feeling need before it needs a solution?",
    tool: "heal",
  };
}

function applyExperience() {
  const plan = makePlan();
  screen.dataset.mood = state.selectedMood.id;
  document.querySelector(".home-header .kicker").textContent = `Good evening, ${state.guestName}`;
  homeMood.textContent = `${state.selectedMood.name} - ${state.selectedReason}`;
  heroMessage.textContent = plan.message;
  heroSubtext.textContent = plan.subtext;
  primaryModeButton.textContent = plan.primary;
  contextPrompt.textContent = plan.prompt;
  journalPrompt.textContent = plan.journal;
  streakValue.textContent = state.memory.streak;
  memoryInsight.textContent = getMemoryInsight();
  trackTitle.textContent = getTrackForMood().title;
  trackMood.textContent = `${state.selectedMood.name} ambience`;
  renderMoodPicker();
  renderReasonPicker();
}

function getMemoryInsight() {
  const wins = Object.entries(state.memory.calmingWins);
  if (!wins.length) return "+20 XP for checking in";
  const [activity] = wins.sort((a, b) => b[1] - a[1])[0];
  return `you calm down with ${activity}`;
}

function recordMood() {
  state.memory.history.unshift({
    mood: state.selectedMood.name,
    reason: state.selectedReason,
    comfort: state.preferences.comfort,
    date: new Date().toISOString(),
  });
  state.memory.history = state.memory.history.slice(0, 20);
  state.memory.calmingWins[state.preferences.comfort.toLowerCase()] = (state.memory.calmingWins[state.preferences.comfort.toLowerCase()] || 0) + 1;
  state.memory.streak = Math.max(1, state.memory.streak + 1);
  save("emora.memory", state.memory);
}

function addChat(text, role = "bot") {
  const bubble = document.createElement("p");
  bubble.className = role;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  const history = load("emora.chat", []);
  history.push({ text, role, date: new Date().toISOString() });
  save("emora.chat", history.slice(-40));
  bubble.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderChatHistory() {
  const history = load("emora.chat", []);
  if (!history.length) return;
  chatLog.innerHTML = "";
  history.slice(-18).forEach((message) => {
    const bubble = document.createElement("p");
    bubble.className = message.role;
    bubble.textContent = message.text;
    chatLog.appendChild(bubble);
  });
}

function getReply(message) {
  const lower = message.toLowerCase();
  const plan = makePlan();
  if (lower.includes("ex") || lower.includes("text")) {
    return isRelationshipContext()
      ? "I remember this is relationship pain. Put the text in the dump. Do not send from the spike."
      : "This does not look like ex-mode context. Let us use grounding instead.";
  }
  if (lower.includes("panic") || lower.includes("anxious")) {
    return `Breathe out slowly. Since ${state.preferences.comfort.toLowerCase()} helps you, pair it with one grounding breath.`;
  }
  if (lower.includes("study") || lower.includes("exam")) {
    return "Make it tiny: one page, one timer, one breath. I will keep this calm.";
  }
  return plan.prompt;
}

function openAi() {
  setFlow("app");
  setTab("ai");
  addChat(makePlan().prompt);
}

function startPrimaryTool() {
  const plan = makePlan();
  if (plan.tool === "ex") {
    exMode.classList.add("open");
    return;
  }
  if (plan.tool === "ai") {
    openAi();
    return;
  }
  setTab("heal");
  addChat(plan.prompt);
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function openExperience(type) {
  const plan = makePlan();
  const experiences = {
    breathing: {
      kicker: "Nervous system reset",
      title: "Breathe with the pulse",
      body: `<div class="breath-pulse big"></div><p>${plan.prompt}</p><button type="button" data-action="music">Add ambience</button>`,
    },
    relax: {
      kicker: "Relax",
      title: "Calming activities",
      body: `<div class="activity-list"><button data-action="music">Play ${getTrackForMood().title}</button><button data-action="grounding">5-4-3-2-1 grounding</button><button data-action="gratitude">One gentle gratitude</button></div>`,
    },
    sleep: {
      kicker: "Sleep",
      title: "Rain and slow breathing",
      body: `<p>Lights low. Volume soft. Let the day get quieter.</p><button type="button" data-action="music">Start sleep ambience</button>`,
    },
    recharge: {
      kicker: "Recharge",
      title: "Ten minute healing walk",
      body: `<p>Step outside or pace gently. No performance, just movement.</p><div class="timer compact">10:00</div><button type="button" data-action="motivate">Start challenge</button>`,
    },
    game: {
      kicker: "Distract",
      title: "Bubble release",
      body: `<div class="bubble-field">${Array.from({ length: 14 }, (_, i) => `<button class="pop-bubble" style="--x:${(i * 23) % 88}%;--y:${(i * 37) % 74}%;--s:${26 + (i % 4) * 9}px"></button>`).join("")}</div>`,
    },
    grounding: {
      kicker: "Grounding",
      title: "Name what is real",
      body: `<p>5 things you see. 4 you feel. 3 you hear. 2 you smell. 1 kind sentence to yourself.</p>`,
    },
    gratitude: {
      kicker: "Journal",
      title: "One line of gratitude",
      body: `<textarea placeholder="Today, one small thing I can thank is..."></textarea><button type="button" data-action="save-note">Save note</button>`,
    },
    voice: {
      kicker: "Voice journal",
      title: "Soft voice note",
      body: `<p>Voice recording is simulated in this local prototype. Speak it out loud, then save the reflection.</p><button type="button" data-action="save-note">Save reflection</button>`,
    },
    music: {
      kicker: "Ambience",
      title: getTrackForMood().title,
      body: `<p>${state.selectedMood.name} ambience is ready. Use the mini-player for pause and volume.</p><button type="button" data-action="toggle-music">Play / pause</button>`,
    },
    level: {
      kicker: "Profile",
      title: "Healing level 7",
      body: `<p>You gain XP through check-ins, journaling, breathing, and returning to yourself.</p>`,
    },
    badges: {
      kicker: "Achievements",
      title: "24 badges unlocked",
      body: `<p>Recent badges: Night Reset, Stayed No-Contact, First Calm Streak.</p>`,
    },
    "mood-memory": {
      kicker: "Emotional memory",
      title: "Your patterns",
      body: `<p>${getMemoryInsight()}. Emora will keep prioritizing what helps.</p>`,
    },
  };
  const item = experiences[type] || experiences.relax;
  experienceKicker.textContent = item.kicker;
  experienceTitle.textContent = item.title;
  experienceBody.innerHTML = item.body;
  experienceSheet.classList.add("open");
  if (type === "music" || type === "sleep") startAmbience();
}

function getTrackForMood() {
  if (isRelationshipContext()) return { title: "Rain piano", freqs: [196, 246.94, 329.63] };
  if (state.selectedMood.id === "happy") return { title: "Sunrise shimmer", freqs: [261.63, 329.63, 392] };
  if (state.selectedMood.id === "motivated") return { title: "Lo-fi focus pulse", freqs: [220, 277.18, 329.63] };
  if (state.selectedMood.id === "calm") return { title: "Galaxy drift", freqs: [174.61, 220, 293.66] };
  return { title: "Soft night ambience", freqs: [164.81, 207.65, 246.94] };
}

function ensureAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    showToast("Unable to load ambience right now.", true);
    return false;
  }
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = Number(volumeControl.value) / 100;
    masterGain.connect(audioContext.destination);
  }
  return true;
}

function stopAmbience() {
  ambienceNodes.forEach((node) => {
    try {
      node.stop();
    } catch {}
  });
  ambienceNodes = [];
  isPlaying = false;
  playPause.textContent = "Play";
  miniPlayer.classList.remove("playing");
}

function startAmbience() {
  if (!ensureAudio()) return;
  stopAmbience();
  const track = getTrackForMood();
  trackTitle.textContent = track.title;
  trackMood.textContent = `${state.selectedMood.name} ambience`;
  track.freqs.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.value = 0.045 / (index + 1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    ambienceNodes.push(osc);
  });
  isPlaying = true;
  playPause.textContent = "Pause";
  miniPlayer.classList.add("playing");
  showToast(`${track.title} started`);
}

function toggleAmbience() {
  if (isPlaying) {
    stopAmbience();
    showToast("Ambience paused");
  } else {
    startAmbience();
  }
}

function formatTimer(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

guestLogin.addEventListener("click", async () => {
  state.guestName = guestName.value.trim() || "Maya";
  localStorage.setItem("emora.guestName", state.guestName);
  await saveProfile();
  setAuthMessage(`Welcome, ${state.guestName}.`);
  setFlow("onboarding");
});

enterButton.addEventListener("click", () => {
  setFlow("login");
});

saveOnboarding.addEventListener("click", () => {
  if (!state.authReady) {
    setAuthMessage("Enter your name and continue first.", true);
    setFlow("login");
    return;
  }
  state.preferences = {
    feeling: document.querySelector("#feelingLately").value,
    comfort: document.querySelector("#comfortPref").value,
    stress: document.querySelector("#stressPref").value,
    goal: document.querySelector("#goalPref").value,
  };
  save("emora.preferences", state.preferences);
  saveProfile();
  setFlow("mood");
});

document.addEventListener("click", (event) => {
  if (!ambienceArmed && appLayer.classList.contains("active")) {
    ambienceArmed = true;
    startAmbience();
  }

  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "toggle-music") toggleAmbience();
    else if (action === "music") openExperience("music");
    else if (action === "save-note") showToast("Saved to your local journal");
    else if (action === "motivate") showToast("+15 XP. Challenge started.");
    else openExperience(action);
  }

  const popBubble = event.target.closest(".pop-bubble");
  if (popBubble) {
    popBubble.classList.add("popped");
    window.setTimeout(() => popBubble.remove(), 220);
    showToast("Released");
  }

  const flowButton = event.target.closest("[data-next-flow]");
  if (flowButton) {
    if (flowButton.id === "guestLogin") {
      state.guestName = guestName.value.trim() || "Maya";
      localStorage.setItem("emora.guestName", state.guestName);
    }
    setFlow(flowButton.dataset.nextFlow);
  }

  const tabButton = event.target.closest("[data-tab-target]");
  if (tabButton) {
    setFlow("app");
    setTab(tabButton.dataset.tabTarget);
  }

  const moodButton = event.target.closest(".mood-choice[data-mood-id]");
  if (moodButton) {
    const mood = moods.find((item) => item.id === moodButton.dataset.moodId);
    if (!mood) return;
    state.selectedMood = mood;
    state.selectedReason = reasons[mood.id][0];
    applyExperience();
    saveProfile();
    setFlow("reason");
  }

  const reasonButton = event.target.closest(".reason-choice");
  if (reasonButton) {
    state.selectedReason = reasonButton.dataset.reason;
    applyExperience();
    recordMood();
    saveProfile();
    setTab("home");
  }
});

window.addEventListener("hashchange", () => {
  const flow = window.location.hash.replace("#", "");
  if (["splash", "login", "onboarding", "mood", "reason", "app"].includes(flow)) {
    setFlow(flow);
    if (flow === "app") setTab("home");
  }
});

openHome.addEventListener("click", async () => {
  recordMood();
  applyExperience();
  await saveProfile();
  setFlow("app");
  setTab("home");
  startAmbience();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addChat(message, "user");
  chatInput.value = "";
  const typing = document.createElement("p");
  typing.className = "bot typing";
  typing.textContent = "Emora is listening...";
  chatLog.appendChild(typing);
  typing.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.setTimeout(() => {
    typing.remove();
    addChat(getReply(message));
  }, 680);
});

aiOrb.addEventListener("click", openAi);
primaryModeButton.addEventListener("click", startPrimaryTool);

relaxNow.addEventListener("click", () => {
  openExperience("relax");
});

closeExMode.addEventListener("click", () => {
  exMode.classList.remove("open");
});

closeExperience.addEventListener("click", () => {
  experienceSheet.classList.remove("open");
  if (breathingInterval) window.clearInterval(breathingInterval);
});

panicButton.addEventListener("click", () => {
  setTab("heal");
  exMode.classList.remove("open");
  addChat("Emergency calm is open. Breathe with the pulse. Do not act from the spike.");
});

window.setInterval(() => {
  timerSeconds = Math.max(0, timerSeconds - 1);
  noContactTimer.textContent = formatTimer(timerSeconds);
}, 1000);

playPause.addEventListener("click", toggleAmbience);

volumeControl.addEventListener("input", () => {
  if (masterGain) masterGain.gain.value = Number(volumeControl.value) / 100;
});

renderMoodPicker();
renderReasonPicker();
applyExperience();
setFlow(window.location.hash.replace("#", "") || "splash");
setTab("home");
guestName.value = state.guestName;
saveProfile();
