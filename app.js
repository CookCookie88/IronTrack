/**
 * IronTrack Pro - Strong-Inspired PWA Engine
 */

const DB_NAME = 'IronTrackProDB';
const DB_VERSION = 3;
let db = null;

const DEFAULT_TEMPLATES = [
  {
    id: 'lower-a',
    name: 'Monday: Lower A (Squat Emphasis)',
    exercises: [
      { name: 'Back Squat', defaultSets: 3, defaultReps: 5 },
      { name: 'Romanian Deadlift', defaultSets: 2, defaultReps: 8 },
      { name: 'Leg Press', defaultSets: 2, defaultReps: 10 },
      { name: 'Plank', defaultSets: 3, defaultReps: 60 }
    ]
  },
  {
    id: 'upper-a',
    name: 'Tuesday: Upper A (Bench + Run)',
    exercises: [
      { name: 'Bench Press', defaultSets: 3, defaultReps: 5 },
      { name: 'Chest-Supported Row', defaultSets: 3, defaultReps: 10 },
      { name: 'Incline Dumbbell Press', defaultSets: 2, defaultReps: 10 },
      { name: 'Triceps Pressdown', defaultSets: 2, defaultReps: 12 }
    ]
  },
  {
    id: 'upper-b',
    name: 'Wednesday: Upper B (Back & Shoulders)',
    exercises: [
      { name: 'Lat Pulldown', defaultSets: 3, defaultReps: 10 },
      { name: 'Seated Cable Row', defaultSets: 2, defaultReps: 10 },
      { name: 'Lateral Raise', defaultSets: 3, defaultReps: 15 },
      { name: 'Dumbbell Curl', defaultSets: 2, defaultReps: 12 }
    ]
  },
  {
    id: 'lower-b',
    name: 'Friday: Lower B (Deadlift Conservative)',
    exercises: [
      { name: 'Deadlift', defaultSets: 2, defaultReps: 5 },
      { name: 'Goblet Squat', defaultSets: 2, defaultReps: 8 },
      { name: 'Hamstring Curl', defaultSets: 2, defaultReps: 12 },
      { name: 'Face Pull', defaultSets: 2, defaultReps: 15 }
    ]
  },
  {
    id: 'saturday-upper',
    name: 'Saturday: Upper Light (Post Long Run)',
    exercises: [
      { name: 'Bench Press (Light)', defaultSets: 3, defaultReps: 8 },
      { name: 'Dumbbell Shoulder Press', defaultSets: 2, defaultReps: 10 },
      { name: 'Pulldown', defaultSets: 2, defaultReps: 10 },
      { name: 'Triceps Extension', defaultSets: 2, defaultReps: 12 }
    ]
  }
];

const DEFAULT_EXERCISES = [
  'Back Squat', 'Bench Press', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 
  'Chest-Supported Row', 'Incline Dumbbell Press', 'Triceps Pressdown', 
  'Lat Pulldown', 'Seated Cable Row', 'Lateral Raise', 'Dumbbell Curl', 
  'Goblet Squat', 'Hamstring Curl', 'Face Pull', 'Plank', 'Bench Press (Light)',
  'Dumbbell Shoulder Press', 'Triceps Extension'
];

let activeWorkout = null;
let restTimerInterval = null;
let restTimeRemaining = 90;
let sessionTimerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  setupNavigation();
  setupTimerControls();
  
  const userSettings = await dbGet('settings', 'user_profile');
  if (!userSettings) {
    document.getElementById('setup-modal').classList.remove('hidden');
  } else {
    renderView('dashboard');
  }

  setupSetupForm();
  registerServiceWorker();
});

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains('workouts')) dbInstance.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
      if (!dbInstance.objectStoreNames.contains('templates')) dbInstance.createObjectStore('templates', { keyPath: 'id' });
      if (!dbInstance.objectStoreNames.contains('exercises')) dbInstance.createObjectStore('exercises', { keyPath: 'name' });
      if (!dbInstance.objectStoreNames.contains('settings')) dbInstance.createObjectStore('settings', { keyPath: 'key' });
      if (!dbInstance.objectStoreNames.contains('bodyweight')) dbInstance.createObjectStore('bodyweight', { keyPath: 'date' });
    };
  });
}

function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

function setupSetupForm() {
  document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bw = parseFloat(document.getElementById('setup-bw').value);
    const squat = parseFloat(document.getElementById('setup-squat').value);
    const bench = parseFloat(document.getElementById('setup-bench').value);
    const deadlift = parseFloat(document.getElementById('setup-deadlift').value);

    await dbPut('settings', { key: 'user_profile', bodyWeight: bw, squatStart: squat, benchStart: bench, deadliftStart: deadlift });
    
    for (const t of DEFAULT_TEMPLATES) await dbPut('templates', t);
    for (const exName of DEFAULT_EXERCISES) await dbPut('exercises', { name: exName });

    document.getElementById('setup-modal').classList.add('hidden');
    renderView('dashboard');
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderView(target);
    });
  });

  document.getElementById('resume-workout-btn').addEventListener('click', () => {
    renderView('logger');
  });
}

async function renderView(viewName) {
  const container = document.getElementById('main-content');
  const titleEl = document.getElementById('view-title');
  container.innerHTML = '';

  switch (viewName) {
    case 'dashboard':
      titleEl.textContent = 'IronTrack Dashboard';
      await renderDashboard(container);
      break;
    case 'templates':
      titleEl.textContent = 'Workouts & Templates';
      await renderTemplatesView(container);
      break;
    case 'history':
      titleEl.textContent = 'Workout History';
      await renderHistoryView(container);
      break;
    case 'analytics':
      titleEl.textContent = 'Analytics & PRs';
      await renderAnalyticsView(container);
      break;
    case 'tools':
      titleEl.textContent = 'Gym Tools & Calculators';
      renderToolsView(container);
      break;
    case 'settings':
      titleEl.textContent = 'Settings & Data';
      renderSettingsView(container);
      break;
    case 'logger':
      titleEl.textContent = activeWorkout ? activeWorkout.name : 'Workout Logger';
      renderLoggerView();
      break;
  }
}

async function renderDashboard(container) {
  const profile = await dbGet('settings', 'user_profile') || { bodyWeight: 170 };
  const workouts = await dbGetAll('workouts') || [];
  const recentWorkouts = workouts.slice(-3).reverse();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Goals & Targets</div>
      <div class="grid-2">
        <div>
          <div class="stat-value">315 lb</div>
          <div class="stat-label">Squat Goal</div>
        </div>
        <div>
          <div class="stat-value">225 lb</div>
          <div class="stat-label">Bench Goal</div>
        </div>
        <div>
          <div class="stat-value">405 lb</div>
          <div class="stat-label">Deadlift Goal</div>
        </div>
        <div>
          <div class="stat-value">&lt; 20:00</div>
          <div class="stat-label">5K Run (4:00/km)</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Body Weight Tracking</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span>Current: <strong>${profile.bodyWeight} lb</strong> (Target: 160 lb)</span>
        <button id="quick-bw-btn" class="btn btn-secondary btn-sm">Update Weight</button>
      </div>
      <small class="text-secondary">Target loss rate: 0.25–0.5 lb/week with 150–170g daily protein.</small>
    </div>

    <div class="card">
      <div class="card-title">Quick Start Workout</div>
      <p class="mb-2 text-secondary">Pick today's session from your reconditioning split:</p>
      <button class="btn btn-primary btn-block mb-2" onclick="startWorkout('lower-a')">Start Monday: Lower A (Squat)</button>
      <button class="btn btn-outline btn-block" onclick="startEmptyWorkout()">Start Empty Workout</button>
    </div>

    <div class="card">
      <div class="card-title">Recent Workouts</div>
      ${recentWorkouts.length === 0 ? '<p class="text-secondary">No workouts logged yet.</p>' : 
        recentWorkouts.map(w => `
          <div style="padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${w.name}</strong><br>
              <small class="text-secondary">${new Date(w.date).toLocaleDateString()} — ${w.exercises.length} exercises</small>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteWorkout(${w.id})">Delete</button>
          </div>
        `).join('')}
    </div>
  `;

  document.getElementById('quick-bw-btn').addEventListener('click', async () => {
    const newBw = prompt('Enter current body weight (lb):', profile.bodyWeight);
    if (newBw && !isNaN(newBw)) {
      profile.bodyWeight = parseFloat(newBw);
      await dbPut('settings', profile);
      await dbPut('bodyweight', { date: new Date().toISOString(), weight: parseFloat(newBw) });
      renderDashboard(container);
    }
  });
}

async function renderTemplatesView(container) {
  const templates = await dbGetAll('templates') || DEFAULT_TEMPLATES;
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Workout Templates & Routines</div>
      <p class="text-secondary mb-4">Start any routine or create a custom one.</p>
      <button class="btn btn-primary btn-block mb-4" onclick="createNewTemplatePrompt()">+ Create New Template</button>
      ${templates.map(t => `
        <div class="exercise-card" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong>${t.name}</strong>
            <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.id}')">Delete</button>
          </div>
          <div class="text-secondary" style="font-size: 0.8rem; margin: 4px 0 8px 0;">
            ${t.exercises.map(ex => `${ex.name} (${ex.defaultSets}x${ex.defaultReps})`).join(', ')}
          </div>
          <button class="btn btn-primary btn-sm" onclick="startWorkout('${t.id}')">Start Workout</button>
        </div>
      `).join('')}
    </div>
  `;
}

window.startWorkout = async function(templateId) {
  const templates = await dbGetAll('templates');
  const template = templates.find(t => t.id === templateId) || DEFAULT_TEMPLATES[0];

  activeWorkout = {
    templateId: template.id,
    name: template.name,
    date: new Date().toISOString(),
    startTime: Date.now(),
    exercises: template.exercises.map(ex => ({
      name: ex.name,
      sets: Array.from({ length: ex.defaultSets }, () => ({ type: 'Normal', weight: 0, reps: ex.defaultReps, completed: false }))
    }))
  };

  startSessionTimer();
  document.getElementById('active-workout-banner').classList.remove('hidden');
  document.getElementById('banner-workout-name').textContent = activeWorkout.name;
  
  renderView('logger');
};

window.startEmptyWorkout = function() {
  activeWorkout = {
    templateId: 'custom-empty',
    name: 'Custom Workout',
    date: new Date().toISOString(),
    startTime: Date.now(),
    exercises: []
  };

  startSessionTimer();
  document.getElementById('active-workout-banner').classList.remove('hidden');
  document.getElementById('banner-workout-name').textContent = activeWorkout.name;
  renderView('logger');
};

function startSessionTimer() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  sessionTimerInterval = setInterval(() => {
    if (!activeWorkout) return;
    const elapsedSecs = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
    const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
    const s = (elapsedSecs % 60).toString().padStart(2, '0');
    const el = document.getElementById('banner-elapsed');
    if (el) el.textContent = `${m}:${s}`;
  }, 1000);
}

window.createNewTemplatePrompt = async function() {
  const name = prompt('Enter routine/template name:');
  if (!name) return;
  const newId = 'template_' + Date.now();
  const newTemplate = {
    id: newId,
    name,
    exercises: [{ name: 'Back Squat', defaultSets: 3, defaultReps: 5 }]
  };
  await dbPut('templates', newTemplate);
  renderView('templates');
};

window.deleteTemplate = async function(id) {
  if (confirm('Delete this template?')) {
    await dbDelete('templates', id);
    renderView('templates');
  }
};

window.deleteWorkout = async function(id) {
  if (confirm('Delete this completed workout from history?')) {
    await dbDelete('workouts', id);
    renderView('dashboard');
  }
};

// Helper: Get previous session performance for an exercise
async function getPreviousPerformance(exerciseName) {
  const workouts = await dbGetAll('workouts') || [];
  // Search backward through past workouts
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    const foundEx = w.exercises.find(e => e.name === exerciseName);
    if (foundEx && foundEx.sets.length > 0) {
      return foundEx.sets.map(s => `${s.weight}lb × ${s.reps}`).join(', ');
    }
  }
  return 'No previous history';
}

async function renderLoggerView() {
  const container = document.getElementById('main-content');
  if (!activeWorkout) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px;">
        <h3>No Active Workout</h3>
        <p class="text-secondary mb-4">Select a template or start an empty workout.</p>
        <button class="btn btn-primary" onclick="renderView('templates')">View Templates</button>
      </div>
    `;
    return;
  }

  // Build HTML for exercises with previous stats loaded
  let exercisesHtml = '';
  for (let exIndex = 0; exIndex < activeWorkout.exercises.length; exIndex++) {
    const ex = activeWorkout.exercises[exIndex];
    const prevStat = await getPreviousPerformance(ex.name);

    exercisesHtml += `
      <div class="exercise-card">
        <div class="exercise-header">
          <strong>${ex.name}</strong>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="addSet(${exIndex})">+ Set</button>
            <button class="btn btn-danger btn-sm" onclick="removeExercise(${exIndex})">✕</button>
          </div>
        </div>
        <div class="prev-stat">Previous: ${prevStat}</div>
        <table class="sets-table">
          <thead>
            <tr><th>SET</th><th>TYPE</th><th>LBS</th><th>REPS</th><th>✓</th></tr>
          </thead>
          <tbody>
            ${ex.sets.map((set, setIndex) => `
              <tr>
                <td><span class="set-type-badge">${setIndex + 1}</span></td>
                <td><span class="set-type-badge" onclick="cycleSetType(${exIndex}, ${setIndex})" title="Tap to change set type">${set.type[0]}</span></td>
                <td><input type="number" value="${set.weight}" onchange="updateSet(${exIndex}, ${setIndex}, 'weight', this.value)"></td>
                <td><input type="number" value="${set.reps}" onchange="updateSet(${exIndex}, ${setIndex}, 'reps', this.value)"></td>
                <td>
                  <button class="set-complete-btn ${set.completed ? 'completed' : ''}" onclick="toggleSet(${exIndex}, ${setIndex})">
                    ${set.completed ? '✓' : ''}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2 style="font-size: 1.05rem;">${activeWorkout.name}</h2>
      <button class="btn btn-success btn-sm" onclick="finishWorkout()">Finish</button>
    </div>

    <div>${exercisesHtml}</div>

    <button class="btn btn-outline btn-block" onclick="openAddExerciseModal()">+ Add Exercise</button>
  `;
}

window.cycleSetType = function(exIndex, setIndex) {
  const types = ['Normal', 'Warmup', 'Drop', 'Failure'];
  const current = activeWorkout.exercises[exIndex].sets[setIndex].type || 'Normal';
  const next = types[(types.indexOf(current) + 1) % types.length];
  activeWorkout.exercises[exIndex].sets[setIndex].type = next;
  renderLoggerView();
};

window.openAddExerciseModal = async function() {
  const exercises = await dbGetAll('exercises') || [];
  let choice = prompt(`Select exercise to add:\n` + exercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n') + `\n\nOr type a brand new exercise name:`);
  
  if (!choice) return;
  let exName = choice;
  const idx = parseInt(choice);
  if (!isNaN(idx) && idx > 0 && idx <= exercises.length) {
    exName = exercises[idx - 1].name;
  } else {
    await dbPut('exercises', { name: exName });
  }

  activeWorkout.exercises.push({
    name: exName,
    sets: [{ type: 'Normal', weight: 0, reps: 10, completed: false }]
  });
  renderLoggerView();
};

window.removeExercise = function(exIndex) {
  activeWorkout.exercises.splice(exIndex, 1);
  renderLoggerView();
};

window.updateSet = function(exIndex, setIndex, field, value) {
  activeWorkout.exercises[exIndex].sets[setIndex][field] = parseFloat(value) || 0;
};

window.toggleSet = function(exIndex, setIndex) {
  const set = activeWorkout.exercises[exIndex].sets[setIndex];
  set.completed = !set.completed;
  if (set.completed) startRestTimer(90);
  renderLoggerView();
};

window.addSet = function(exIndex) {
  const lastSet = activeWorkout.exercises[exIndex].sets.slice(-1)[0] || { weight: 0, reps: 10, type: 'Normal' };
  activeWorkout.exercises[exIndex].sets.push({ type: 'Normal', weight: lastSet.weight, reps: lastSet.reps, completed: false });
  renderLoggerView();
};

window.finishWorkout = async function() {
  if (confirm('Finish and save workout?')) {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    await dbPut('workouts', activeWorkout);
    activeWorkout = null;
    document.getElementById('active-workout-banner').classList.add('hidden');
    alert('Workout saved successfully!');
    renderView('history');
  }
};

async function renderHistoryView(container) {
  const workouts = await dbGetAll('workouts') || [];
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Completed Workouts (${workouts.length})</div>
      ${workouts.length === 0 ? '<p class="text-secondary">No history found.</p>' :
        workouts.reverse().map(w => `
          <div class="exercise-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong>${w.name}</strong>
              <button class="btn btn-danger btn-sm" onclick="deleteWorkout(${w.id})">Delete</button>
            </div>
            <div class="text-secondary" style="font-size: 0.8rem; margin: 4px 0;">${new Date(w.date).toLocaleString()}</div>
            <div style="font-size: 0.85rem;">
              ${w.exercises.map(ex => `• ${ex.name}: ${ex.sets.length} sets`).join('<br>')}
            </div>
          </div>
        `).join('')}
    </div>
  `;
}

async function renderAnalyticsView(container) {
  const workouts = await dbGetAll('workouts') || [];
  let totalVolume = 0;
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(s => { if (s.completed) totalVolume += (s.weight * s.reps); });
    });
  });

  container.innerHTML = `
    <div class="card">
      <div class="card-title">Training Analytics</div>
      <div class="grid-2">
        <div>
          <div class="stat-value">${workouts.length}</div>
          <div class="stat-label">Total Workouts</div>
        </div>
        <div>
          <div class="stat-value">${totalVolume.toLocaleString()} lb</div>
          <div class="stat-label">Total Volume Lifted</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Estimated 1RM (Epley Formula)</div>
      <p class="text-secondary" style="font-size: 0.85rem;">Calculates estimated max strength from recent working sets. Use conservative loads during reconditioning.</p>
    </div>
  `;
}

function renderToolsView(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Plate Calculator (45lb Bar)</div>
      <div class="form-group">
        <label>Target Weight (lb)</label>
        <input type="number" id="plate-target" value="225" step="5" oninput="calculatePlates(this.value)">
      </div>
      <div id="plate-result" style="font-weight: 600; color: var(--accent); margin-top: 8px;"></div>
    </div>

    <div class="card">
      <div class="card-title">1RM Calculator</div>
      <div class="form-group">
        <label>Weight Lifted (lb)</label>
        <input type="number" id="rm-weight" value="225" oninput="calculateRM()">
      </div>
      <div class="form-group">
        <label>Reps Performed</label>
        <input type="number" id="rm-reps" value="5" oninput="calculateRM()">
      </div>
      <div id="rm-result" style="font-weight: 600; color: var(--accent); margin-top: 8px;"></div>
    </div>
  `;
  calculatePlates(225);
  calculateRM();
}

window.calculatePlates = function(target) {
  target = parseFloat(target) || 0;
  const bar = 45;
  if (target < bar) {
    document.getElementById('plate-result').textContent = 'Weight is less than Olympic bar (45 lb).';
    return;
  }
  let remainder = (target - bar) / 2;
  const plates = [45, 35, 25, 10, 5, 2.5];
  let breakdown = [];
  for (const p of plates) {
    const count = Math.floor(remainder / p);
    if (count > 0) {
      breakdown.push(`${count}x${p}lb`);
      remainder -= count * p;
    }
  }
  document.getElementById('plate-result').textContent = breakdown.length > 0 ? `Per side: ${breakdown.join(', ')}` : 'Only empty bar';
};

window.calculateRM = function() {
  const w = parseFloat(document.getElementById('rm-weight').value) || 0;
  const r = parseFloat(document.getElementById('rm-reps').value) || 0;
  const epley = Math.round(w * (1 + r / 30));
  document.getElementById('rm-result').textContent = `Estimated 1RM: ${epley} lb`;
};

function renderSettingsView(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Data Backup & Export</div>
      <p class="text-secondary mb-4" style="font-size: 0.85rem;">Export your database JSON backup periodically to iCloud Drive or Files to prevent data loss.</p>
      <button class="btn btn-primary btn-block mb-2" onclick="exportJSON()">Export Backup (JSON)</button>
      <button class="btn btn-secondary btn-block" onclick="exportCSV()">Export Workout History (CSV)</button>
    </div>
  `;
}

window.exportJSON = async function() {
  const workouts = await dbGetAll('workouts') || [];
  const templates = await dbGetAll('templates') || [];
  const settings = await dbGetAll('settings') || [];
  const exercises = await dbGetAll('exercises') || [];
  const data = { workouts, templates, settings, exercises, exportDate: new Date().toISOString() };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `irontrack-pro-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

window.exportCSV = async function() {
  const workouts = await dbGetAll('workouts') || [];
  let csv = 'WorkoutName,Date,Exercise,Set,Type,Weight,Reps\n';
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach((s, idx) => {
        csv += `"${w.name}","${w.date}","${ex.name}",${idx + 1},"${s.type || 'Normal'}",${s.weight},${s.reps}\n`;
      });
    });
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `irontrack-history-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

function setupTimerControls() {
  document.getElementById('quick-timer-btn').addEventListener('click', showTimerModal);
  document.getElementById('timer-close-btn').addEventListener('click', () => {
    document.getElementById('timer-overlay').classList.add('hidden');
  });
  document.getElementById('timer-toggle-btn').addEventListener('click', () => {
    if (restTimerInterval) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      document.getElementById('timer-toggle-btn').textContent = 'Resume';
    } else {
      startRestTimer(restTimeRemaining, false);
    }
  });

  document.querySelectorAll('.timer-controls button[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.getAttribute('data-time'));
      restTimeRemaining = Math.max(0, restTimeRemaining + delta);
      updateTimerDisplay();
    });
  });
}

function startRestTimer(seconds = 90) {
  restTimeRemaining = seconds;
  showTimerModal();
  if (restTimerInterval) clearInterval(restTimerInterval);
  document.getElementById('timer-toggle-btn').textContent = 'Pause';

  restTimerInterval = setInterval(() => {
    restTimeRemaining--;
    updateTimerDisplay();
    if (restTimeRemaining <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      document.getElementById('timer-overlay').classList.add('hidden');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function showTimerModal() {
  document.getElementById('timer-overlay').classList.remove('hidden');
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(restTimeRemaining / 60).toString().padStart(2, '0');
  const s = (restTimeRemaining % 60).toString().padStart(2, '0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
}