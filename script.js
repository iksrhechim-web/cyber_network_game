
"use strict";

// ========================================
// CYBER DEFENSE - GAME CONFIGURATION
// ========================================

const MISSION_DURATION = 90;
const SPAWN_INTERVAL = 3200;
const MAX_PENDING_CONNECTIONS = 5;

const $ = (id) => document.getElementById(id);

const elements = {
  score: $("score"),
  securityValue: $("securityValue"),
  securityBar: $("securityBar"),
  blocked: $("blocked"),
  timer: $("timer"),
  trafficCount: $("trafficCount"),
  connectionList: $("connectionList"),
  intelContent: $("intelContent"),
  eventLog: $("eventLog"),
  networkMap: $("networkMap"),
  startBtn: $("startBtn"),
  restartBtn: $("restartBtn"),
  resultModal: $("resultModal"),
  resultTitle: $("resultTitle"),
  resultMessage: $("resultMessage"),
  resultSymbol: $("resultSymbol"),
  finalScore: $("finalScore"),
  finalBlocked: $("finalBlocked"),
  finalAccuracy: $("finalAccuracy"),
  playAgainBtn: $("playAgainBtn")
};

// These are fictional, simulated network events.
// They do not represent actual network traffic.
const connectionTemplates = [
  {
    type: "safe",
    ip: "192.168.1.24",
    port: 443,
    protocol: "HTTPS",
    service: "Web service",
    behavior: "Expected encrypted traffic",
    reason: "HTTPS is commonly used for legitimate encrypted web traffic."
  },
  {
    type: "threat",
    ip: "185.220.101.17",
    port: 22,
    protocol: "SSH",
    service: "Remote access",
    behavior: "Repeated login attempts",
    reason: "Repeated authentication attempts can indicate a brute-force attack."
  },
  {
    type: "safe",
    ip: "192.168.1.35",
    port: 53,
    protocol: "DNS",
    service: "Name resolution",
    behavior: "Routine DNS lookup",
    reason: "A routine DNS lookup is consistent with normal name resolution."
  },
  {
    type: "threat",
    ip: "203.0.113.77",
    port: 4444,
    protocol: "TCP",
    service: "Unknown service",
    behavior: "Unexpected outbound-control pattern",
    reason: "An unexpected connection on an unusual service port deserves investigation."
  },
  {
    type: "safe",
    ip: "192.168.1.42",
    port: 443,
    protocol: "HTTPS",
    service: "API gateway",
    behavior: "Expected API request",
    reason: "Expected API traffic over HTTPS is consistent with normal application activity."
  },
  {
    type: "threat",
    ip: "198.51.100.42",
    port: 3389,
    protocol: "RDP",
    service: "Remote desktop",
    behavior: "Unexpected remote-access request",
    reason: "Unsolicited remote desktop traffic can expose a system to unauthorized access."
  },
  {
    type: "safe",
    ip: "192.168.1.60",
    port: 123,
    protocol: "NTP",
    service: "Time synchronization",
    behavior: "Routine time synchronization",
    reason: "NTP is commonly used to synchronize system clocks."
  },
  {
    type: "threat",
    ip: "203.0.113.91",
    port: 23,
    protocol: "Telnet",
    service: "Legacy remote access",
    behavior: "Unexpected plaintext login",
    reason: "Telnet transmits data without encryption and is risky when exposed."
  },
  {
    type: "safe",
    ip: "192.168.1.81",
    port: 443,
    protocol: "HTTPS",
    service: "Application server",
    behavior: "Expected encrypted session",
    reason: "The observed session matches the expected encrypted application traffic."
  },
  {
    type: "threat",
    ip: "198.51.100.88",
    port: 445,
    protocol: "SMB",
    service: "File sharing",
    behavior: "Unexpected file-sharing probe",
    reason: "Unexpected SMB probes can indicate attempts to discover or access file shares."
  },
  {
    type: "safe",
    ip: "192.168.1.92",
    port: 587,
    protocol: "SMTP",
    service: "Mail submission",
    behavior: "Expected mail submission",
    reason: "Mail submission is normal when it comes from an authorized mail client."
  },
  {
    type: "threat",
    ip: "203.0.113.120",
    port: 8080,
    protocol: "HTTP",
    service: "Web proxy",
    behavior: "Repeated requests to restricted paths",
    reason: "Repeated requests to restricted paths may indicate automated reconnaissance."
  }
];

// ========================================
// GAME STATE
// ========================================

let game = null;
let spawnInterval = null;
let countdownInterval = null;
let nextConnectionId = 1;

function createInitialState() {
  return {
    running: false,
    finished: false,
    score: 0,
    security: 100,
    blocked: 0,
    allowed: 0,
    correct: 0,
    decisions: 0,
    timeLeft: MISSION_DURATION,
    connections: [],
    usedIPs: [],
    recentTemplates: [],
    highScore: loadHighScore()
  };
}

// High score is stored locally in the browser.
function loadHighScore() {
  try {
    return Number(localStorage.getItem("cyberDefenseHighScore")) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem("cyberDefenseHighScore", String(score));
  } catch {
    // The game remains playable if storage is unavailable.
  }
}

// ========================================
// INITIALIZATION
// ========================================

function initializeGame() {
  clearInterval(spawnInterval);
  clearInterval(countdownInterval);

  game = createInitialState();
  nextConnectionId = 1;

  elements.resultModal.hidden = true;
  elements.startBtn.hidden = false;
  elements.restartBtn.hidden = true;
  elements.startBtn.disabled = false;

  elements.connectionList.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⌁</span>
      <p>Network traffic will appear here.</p>
      <span>Initialize the mission to begin.</span>
    </div>
  `;

  elements.eventLog.replaceChildren();
  elements.intelContent.innerHTML = `
    <div class="intel-icon">◈</div>
    <p>Threat intelligence will update as you analyze connections.</p>
  `;

  document.querySelectorAll(".network-node").forEach((node) => {
    node.classList.remove("compromised", "warning");
  });

  updateDashboard();

  addLog("SYS", "Simulation initialized.");
  addLog("SYS", "Awaiting analyst authorization.");
}

function startMission() {
  if (game.running) return;

  initializeGame();

  game.running = true;

  elements.startBtn.hidden = true;
  elements.restartBtn.hidden = false;

  addLog("SYS", "Mission started. Monitor incoming connections.");
  updateIntel(
    "Mission active. Inspect connection behavior, service ports, " +
    "and whether the traffic is expected before making a decision."
  );

  // Start with two connections for immediate gameplay.
  spawnConnection();
  spawnConnection();

  spawnInterval = setInterval(() => {
    if (!game.running) return;
    spawnConnection();
  }, SPAWN_INTERVAL);

  countdownInterval = setInterval(() => {
    if (!game.running) return;

    game.timeLeft -= 1;
    updateDashboard();

    if (game.timeLeft <= 0) {
      endMission("time");
    }
  }, 1000);
}

// ========================================
// CONNECTION GENERATION
// ========================================

function spawnConnection() {
  if (!game.running) return;

  const pending = game.connections.filter(
    (connection) => !connection.processed
  );

  if (pending.length >= MAX_PENDING_CONNECTIONS) {
    // A malicious connection that remains unattended
    // is treated as a missed threat.
    const oldest = pending[0];

    if (oldest && oldest.type === "threat") {
      game.security = Math.max(0, game.security - 12);

      addLog(
        "ALERT",
        `Unresolved threat ${oldest.ip} reached the queue limit.`,
        "log-danger"
      );

      markNodeCompromised();
      updateIntel(
        "An unresolved malicious connection has been missed. " +
        "Prioritize suspicious traffic before the queue fills."
      );

      updateDashboard();

      if (game.security <= 0) {
        endMission("breach");
        return;
      }
    }

    if (oldest) {
      oldest.processed = true;
      oldest.outcome = "MISSED";
      renderConnections();
    }
  }

  const template = chooseConnectionTemplate();

  const connection = {
    ...template,
    id: nextConnectionId++,
    processed: false,
    outcome: null
  };

  game.connections.push(connection);

  addLog(
    "NET",
    `New ${connection.protocol} connection: ${connection.ip}`
  );

  renderConnections();
  updateDashboard();
}

function chooseConnectionTemplate() {
  // Avoid repeating the most recent two templates where possible.
  const available = connectionTemplates.filter(
    (template) => !game.recentTemplates.includes(template.ip)
  );

  const pool = available.length ? available : connectionTemplates;

  const template = pool[Math.floor(Math.random() * pool.length)];

  game.recentTemplates.push(template.ip);

  if (game.recentTemplates.length > 2) {
    game.recentTemplates.shift();
  }

  return template;
}

// ========================================
// RENDER CONNECTIONS
// ========================================

function renderConnections() {
  const connections = [...game.connections].reverse();

  if (connections.length === 0) {
    elements.connectionList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⌁</span>
        <p>No connections detected.</p>
        <span>Waiting for incoming traffic.</span>
      </div>
    `;
    return;
  }

  elements.connectionList.innerHTML = connections
    .map((connection) => {
      const processed = connection.processed;

      const badge = connection.type === "threat"
        ? '<span class="threat-pill danger">ANOMALOUS PATTERN</span>'
        : '<span class="threat-pill safe">EXPECTED PATTERN</span>';

      let status = "AWAITING REVIEW";
      let statusClass = "";

      if (connection.outcome === "CORRECT") {
        status = "CORRECT DECISION";
        statusClass = "correct";
      } else if (connection.outcome === "INCORRECT") {
        status = "INCORRECT DECISION";
        statusClass = "incorrect";
      } else if (connection.outcome === "MISSED") {
        status = "MISSED";
        statusClass = "incorrect";
      }

      return `
        <article class="connection-card ${processed ? "processed" : ""}"
                 data-id="${connection.id}">
          <div class="connection-top">
            <span class="ip-address">${connection.ip}</span>
            ${badge}
          </div>

          <div class="connection-details">
            <div>
              <span class="detail-label">PORT</span>
              <span class="detail-value">${connection.port}</span>
            </div>
            <div>
              <span class="detail-label">PROTOCOL</span>
              <span class="detail-value">${connection.protocol}</span>
            </div>
            <div>
              <span class="detail-label">SERVICE</span>
              <span class="detail-value">${connection.service}</span>
            </div>
          </div>

          <div class="connection-details">
            <div style="grid-column: 1 / -1">
              <span class="detail-label">OBSERVED BEHAVIOR</span>
              <span class="detail-value">${connection.behavior}</span>
            </div>
          </div>

          <div class="connection-bottom">
            <span class="decision-status ${statusClass}">
              ${status}
            </span>

            <div class="decision-buttons">
              <button class="action-btn block-btn"
                      data-action="block"
                      data-id="${connection.id}"
                      ${processed || !game.running ? "disabled" : ""}
                      aria-label="Block ${connection.ip}">
                BLOCK
              </button>
              <button class="action-btn allow-btn"
                      data-action="allow"
                      data-id="${connection.id}"
                      ${processed || !game.running ? "disabled" : ""}
                      aria-label="Allow ${connection.ip}">
                ALLOW
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const pending = game.connections.filter(
    (connection) => !connection.processed
  ).length;

  elements.trafficCount.textContent = `${pending} PENDING`;
}

// ========================================
// PLAYER DECISIONS
// ========================================

elements.connectionList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button || !game || !game.running) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  const connection = game.connections.find(
    (item) => item.id === id
  );

  if (!connection || connection.processed) return;

  processDecision(connection, action);
});

function processDecision(connection, action) {
  if (!game.running || connection.processed) return;

  connection.processed = true;
  game.decisions += 1;

  const choseBlock = action === "block";
  const isThreat = connection.type === "threat";
  const correct = choseBlock === isThreat;

  if (correct) {
    game.correct += 1;
    game.score += 100;
    connection.outcome = "CORRECT";

    if (isThreat) {
      game.blocked += 1;

      addLog(
        "DEF",
        `Threat blocked: ${connection.ip}`,
        "log-success"
      );

      updateIntel(connection.reason);
    } else {
      game.allowed += 1;

      addLog(
        "DEF",
        `Legitimate traffic allowed: ${connection.ip}`,
        "log-success"
      );

      updateIntel(
        "Correct classification. " + connection.reason
      );
    }
  } else {
    game.score = Math.max(0, game.score - 50);
    game.security = Math.max(0, game.security - 15);
    connection.outcome = "INCORRECT";

    if (isThreat) {
      addLog(
        "ALERT",
        `Malicious traffic allowed: ${connection.ip}`,
        "log-danger"
      );

      markNodeCompromised();

      updateIntel(
        "A malicious connection was allowed. " +
        connection.reason
      );
    } else {
      addLog(
        "ALERT",
        `Legitimate traffic blocked: ${connection.ip}`,
        "log-danger"
      );

      updateIntel(
        "False positive detected. Not every unfamiliar connection " +
        "is malicious. " + connection.reason
      );
    }
  }

  renderConnections();
  updateDashboard();

  if (game.security <= 0) {
    endMission("breach");
  }
}

// ========================================
// DASHBOARD AND FEEDBACK
// ========================================

function updateDashboard() {
  if (!game) return;

  elements.score.textContent = String(game.score).padStart(4, "0");
  elements.securityValue.textContent = `${game.security}%`;
  elements.blocked.textContent = String(game.blocked).padStart(2, "0");

  const minutes = Math.floor(game.timeLeft / 60);
  const seconds = game.timeLeft % 60;

  elements.timer.textContent =
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;

  elements.securityBar.style.width = `${game.security}%`;

  if (game.security > 60) {
    elements.securityBar.style.background = "var(--green)";
    elements.securityValue.style.color = "var(--green)";
  } else if (game.security > 30) {
    elements.securityBar.style.background = "var(--yellow)";
    elements.securityValue.style.color = "var(--yellow)";
  } else {
    elements.securityBar.style.background = "var(--red)";
    elements.securityValue.style.color = "var(--red)";
  }
}

function updateIntel(message) {
  elements.intelContent.innerHTML = `
    <div class="intel-icon">◈</div>
    <p>${message}</p>
  `;
}

function addLog(source, message, className = "") {
  const row = document.createElement("p");
  const timestamp = document.createElement("time");
  const text = document.createElement("span");

  timestamp.textContent = source;
  text.textContent = message;

  if (className) {
    text.className = className;
  }

  row.append(timestamp, text);
  elements.eventLog.prepend(row);

  // Keep the log compact.
  while (elements.eventLog.children.length > 20) {
    elements.eventLog.lastElementChild.remove();
  }
}

function markNodeCompromised() {
  const nodes = elements.networkMap.querySelectorAll(".network-node");

  // Select one of the simulated infrastructure nodes.
  const targets = Array.from(nodes).filter(
    (node) => !node.classList.contains("compromised")
  );

  if (targets.length === 0) return;

  const target = targets[Math.floor(Math.random() * targets.length)];

  target.classList.add("compromised");

  const state = target.querySelector(".node-state");

  if (state) {
    state.textContent = "AT RISK";
  }
}

// ========================================
// MISSION RESULTS
// ========================================

function endMission(reason) {
  if (!game.running) return;

  game.running = false;
  game.finished = true;

  clearInterval(spawnInterval);
  clearInterval(countdownInterval);

  updateDashboard();
  renderConnections();

  const accuracy = game.decisions > 0
    ? Math.round((game.correct / game.decisions) * 100)
    : 0;

  const survived = reason === "time" && game.security > 0;

  let title;
  let message;

  if (survived && game.security >= 70) {
    title = "NETWORK SECURED";
    message = "Excellent defense. You survived the mission while keeping the network operational.";
    elements.resultSymbol.textContent = "⬡";
    elements.resultSymbol.style.color = "var(--green)";
  } else if (survived) {
    title = "MISSION COMPLETE";
    message = "You survived the attack, but the network took damage. Review your decisions and improve your threat detection.";
    elements.resultSymbol.textContent = "◈";
    elements.resultSymbol.style.color = "var(--yellow)";
  } else {
    title = "NETWORK BREACHED";
    message = "Network security reached zero. Review the missed threats and incorrect decisions before trying again.";
    elements.resultSymbol.textContent = "⚠";
    elements.resultSymbol.style.color = "var(--red)";
  }

  elements.resultTitle.textContent = title;
  elements.resultMessage.textContent = message;
  elements.finalScore.textContent = game.score;
  elements.finalBlocked.textContent = game.blocked;
  elements.finalAccuracy.textContent = `${accuracy}%`;

  if (game.score > game.highScore) {
    game.highScore = game.score;
    saveHighScore(game.score);
  }

  addLog(
    "SYS",
    `Mission ended. Score: ${game.score}. Accuracy: ${accuracy}%.`
  );

  elements.startBtn.hidden = true;
  elements.restartBtn.hidden = false;

  elements.resultModal.hidden = false;
  elements.playAgainBtn.focus();
}

// ========================================
// CONTROLS
// ========================================

elements.startBtn.addEventListener("click", startMission);

elements.restartBtn.addEventListener("click", () => {
  initializeGame();
  startMission();
});

elements.playAgainBtn.addEventListener("click", () => {
  initializeGame();
  startMission();
});

// Escape closes nothing during a mission because the result
// screen is part of the game flow. Restart remains available.

initializeGame();
