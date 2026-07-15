/**
* Lord Game (영주 게임) - Game Logic
* Self-contained Single Page Web Game
*/

// --- Audio System (Web Audio API Synthesizer) ---
class GameAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playClick() {
        if (this.muted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playSuccess() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const playTone = (freq, time, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + duration);
        };

        // Major Arpeggio (C4 -> E4 -> G4 -> C5)
        playTone(261.63, now, 0.15);       // C4
        playTone(329.63, now + 0.1, 0.15); // E4
        playTone(392.00, now + 0.2, 0.15); // G4
        playTone(523.25, now + 0.3, 0.4);  // C5
    }

    playWarning() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.25);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.25);
    }

    playVictoryFanfare() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const playBrass = (freq, startTime, duration) => {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(freq, startTime);

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(freq + 2, startTime); // detune slightly

            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + duration);
            osc2.stop(startTime + duration);
        };

        // Fanfare chord progression in C major
        // Beat 1: C4, E4, G4
        playBrass(261.63, now, 0.3);       // C4
        playBrass(329.63, now, 0.3);       // E4
        playBrass(392.00, now, 0.3);       // G4

        // Beat 2: G4, B4, D5
        playBrass(392.00, now + 0.35, 0.3); // G4
        playBrass(493.88, now + 0.35, 0.3); // B4
        playBrass(587.33, now + 0.35, 0.3); // D5

        // Beat 3: C5, E5, G5 (Grand Finale)
        playBrass(523.25, now + 0.7, 1.2);  // C5
        playBrass(659.25, now + 0.7, 1.2);  // E5
        playBrass(783.99, now + 0.7, 1.2);  // G5
    }

    playDefeatSound() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;

        const playTone = (freq, time, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.linearRampToValueAtTime(freq - 50, time + duration);

            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + duration);
        };

        playTone(220, now, 0.25);
        playTone(180, now + 0.3, 0.25);
        playTone(140, now + 0.6, 0.5);
    }
}

const audio = new GameAudio();

// --- Game Configurations & State ---
const RANKS = [
    { threshold: 1, name: "초보 영주" },
    { threshold: 2, name: "남작 (Baron)" },
    { threshold: 4, name: "자작 (Viscount)" },
    { threshold: 6, name: "백작 (Count)" },
    { threshold: 8, name: "후작 (Marquis)" },
    { threshold: 9, name: "공작 (Duke)" },
    { threshold: 10, name: "황제 (Emperor)" }
];

let playerPower = 50;
let territories = [];

// Territory coordinates configured on a responsive 0-100 grid.
// Connections establish adjacent nodes.
const INITIAL_TERRITORIES_DATA = [
    { id: 1, name: "시작의 영지", power: 50, x: 15, y: 70, adj: [2, 3], isPlayer: true },
    { id: 2, name: "남부 평원", power: 30, x: 30, y: 82, adj: [1, 4, 5], isPlayer: false },
    { id: 3, name: "서풍 계곡", power: 60, x: 25, y: 45, adj: [1, 4, 6], isPlayer: false },
    { id: 4, name: "안개 숲", power: 90, x: 45, y: 62, adj: [2, 3, 7], isPlayer: false },
    { id: 5, name: "강철 요새", power: 120, x: 50, y: 84, adj: [2, 6, 8], isPlayer: false },
    { id: 6, name: "황혼의 늪", power: 150, x: 45, y: 30, adj: [3, 5, 9], isPlayer: false },
    { id: 7, name: "얼어붙은 산맥", power: 180, x: 68, y: 50, adj: [4, 8, 10], isPlayer: false },
    { id: 8, name: "용암 절벽", power: 210, x: 72, y: 78, adj: [5, 7, 10], isPlayer: false },
    { id: 9, name: "모래바람 사막", power: 240, x: 68, y: 22, adj: [6, 10], isPlayer: false },
    { id: 10, name: "불사의 성", power: 1000, x: 88, y: 40, adj: [7, 8, 9], isPlayer: false, isBoss: true }
];

// --- Celebration/Confetti Canvas Logic ---
let canvas, ctx;
let confettiParticles = [];
let animationFrameId = null;

function initConfetti() {
    canvas = document.getElementById('celebration-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

class Confetti {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.r = Math.random() * 6 + 4;
        this.d = Math.random() * canvas.height;
        this.color = `hsl(${Math.random() * 360}, 90%, 60%)`;
        this.tilt = Math.random() * 10 - 5;
        this.tiltAngleIncremental = Math.random() * 0.07 + 0.02;
        this.tiltAngle = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.lineWidth = this.r / 2;
        ctx.strokeStyle = this.color;
        ctx.moveTo(this.x + this.tilt + this.r / 2, this.y);
        ctx.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 2);
        ctx.stroke();
    }

    update() {
        this.tiltAngle += this.tiltAngleIncremental;
        this.y += (Math.cos(this.d) + 3 + this.r / 2) / 2;
        this.x += Math.sin(this.tiltAngle);
        this.tilt = Math.sin(this.tiltAngle - this.r / 2) * 5;

        // Loop confetti to top if it falls off screen
        if (this.y > canvas.height) {
            this.x = Math.random() * canvas.width;
            this.y = -20;
            this.tilt = Math.random() * 10 - 5;
        }
    }
}

function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
        p.update();
        p.draw();
    });
    animationFrameId = requestAnimationFrame(animateConfetti);
}

function startCelebration() {
    if (canvas) canvas.classList.remove('hidden');
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
        confettiParticles.push(new Confetti());
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animateConfetti();
}

function stopCelebration() {
    if (canvas) canvas.classList.add('hidden');
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// --- Game Controller Logic ---
function initGame() {
    playerPower = 50;
    // Deep clone the configuration structure
    territories = INITIAL_TERRITORIES_DATA.map(t => ({ ...t, isPlayer: t.isPlayer }));

    // Add default log
    const logContent = document.getElementById('log-content');
    logContent.innerHTML = '<div class="log-item system">영주님, 천하 통일을 위한 정벌을 시작할 준비가 되었습니다.</div>';

    renderMap();
    updateUI();
    stopCelebration();
}

// Draw connections between territories on SVG overlay
function drawConnections() {
    const svg = document.getElementById('connections-svg');
    const container = document.getElementById('map-container');
    svg.innerHTML = ''; // Clear lines

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const drawnPairs = new Set();

    territories.forEach(t => {
        t.adj.forEach(adjId => {
            const neighbor = territories.find(n => n.id === adjId);
            if (!neighbor) return;

            // Generate unique key for directionless connection pair
            const key = [t.id, neighbor.id].sort((a, b) => a - b).join('-');
            if (drawnPairs.has(key)) return;
            drawnPairs.add(key);

            const x1 = (t.x / 100) * width;
            const y1 = (t.y / 100) * height;
            const x2 = (neighbor.x / 100) * width;
            const y2 = (neighbor.y / 100) * height;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('class', 'connection-line');

            // Stylize connections based on ownership status
            if (t.isPlayer && neighbor.isPlayer) {
                line.classList.add('owned');
            }

            svg.appendChild(line);
        });
    });
}

// Dynamically generate territory DOM elements on the map
function renderMap() {
    const container = document.getElementById('map-container');

    // Remove existing nodes (preserve the SVG canvas)
    const existingNodes = container.querySelectorAll('.territory-node');
    existingNodes.forEach(node => node.remove());

    territories.forEach(t => {
        const node = document.createElement('div');
        node.id = `node-${t.id}`;
        node.className = 'territory-node';
        node.style.left = `${t.x}%`;
        node.style.top = `${t.y}%`;

        if (t.isBoss) {
            node.classList.add('final-boss');
        }

        // Create the small marker pin
        const pin = document.createElement('div');
        pin.className = 'marker-pin';
        pin.textContent = t.isPlayer ? '🏰' : '🛡️';

        // Create the info container (outside the pin)
        const info = document.createElement('div');
        info.className = 'territory-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'territory-name';
        nameSpan.textContent = t.name;

        const powerSpan = document.createElement('span');
        powerSpan.className = 'territory-power';
        powerSpan.textContent = t.power;

        info.appendChild(nameSpan);
        info.appendChild(powerSpan);

        node.appendChild(pin);
        node.appendChild(info);

        // Capture click event for invasion
        node.addEventListener('click', () => {
            handleTerritoryClick(t.id);
        });

        container.appendChild(node);
    });

    // Draw connecting paths
    drawConnections();
}

// Assess node relations and update CSS classes representing status (Owned, Possible, Locked)
function updateNodeStates() {
    territories.forEach(t => {
        const node = document.getElementById(`node-${t.id}`);
        if (!node) return;

        // Reset state classes
        node.classList.remove('owned', 'possible', 'locked');

        const pin = node.querySelector('.marker-pin');
        const powerText = node.querySelector('.territory-power');

        if (t.isPlayer) {
            node.classList.add('owned');
            if (pin) pin.textContent = '🏰';
            if (powerText) powerText.textContent = playerPower;
        } else {
            if (pin) pin.textContent = '🛡️';
            if (powerText) powerText.textContent = t.power;
        }
    });
}

// Handles user interaction with territories
function handleTerritoryClick(id) {
    audio.playClick();

    const target = territories.find(t => t.id === id);
    if (!target) return;

    if (target.isPlayer) {
        addLog("system", "🏰 이미 영주님의 직할령입니다. 군사력을 모아 인접한 다른 땅을 정벌하세요!");
        return;
    }

    // Check adjacency
    const ownedIds = territories.filter(t => t.isPlayer).map(t => t.id);
    const isAdjacent = target.adj.some(adjId => ownedIds.includes(adjId));

    if (!isAdjacent) {
        audio.playWarning();
        addLog("lose", `⚠️ ${target.name}에 도달할 수 없습니다. 먼저 그 길목의 영토를 점령해야 합니다.`);
        return;
    }

    // Check strength
    if (playerPower < target.power) {
        audio.playDefeatSound();
        addLog("lose", `⚔️ 침공 실패: ${target.name}(군사력 ${target.power})을 정벌하려다 내 군사력(${playerPower})이 패퇴하고 영지를 몰수당했습니다!`);

        // Shake animation for warning
        const node = document.getElementById(`node-${id}`);
        node.style.animation = 'none';
        node.offsetHeight; // Trigger reflow
        node.style.animation = 'attack-shock 0.4s ease-in-out';

        // Trigger Defeat Game Over modal
        setTimeout(() => {
            const modal = document.getElementById('defeat-modal');
            const defeatPowerSpan = document.getElementById('defeat-power');
            const defeatTerritoriesSpan = document.getElementById('defeat-territories');

            defeatPowerSpan.textContent = playerPower;
            const ownedCount = territories.filter(t => t.isPlayer).length;
            defeatTerritoriesSpan.textContent = `${ownedCount} / ${territories.length}`;

            modal.classList.remove('hidden');
        }, 800);
        return;
    }

    // Invasion Success!
    target.isPlayer = true;
    const addedPower = target.power;
    playerPower += addedPower;

    // Attack Success feedback
    audio.playSuccess();
    addLog("win", `🏆 정벌 성공! ${target.name}(군사력 ${addedPower})을 복속시켰습니다. 군사력이 ${addedPower}만큼 증가하여 현재 [${playerPower}]이 되었습니다.`);

    // Visual shockwave on successfully conquered node
    const node = document.getElementById(`node-${id}`);
    node.classList.add('attack-animation');
    node.addEventListener('animationend', () => {
        node.classList.remove('attack-animation');
    }, { once: true });

    // Update state and UI
    drawConnections();
    updateUI();

    // Check Victory
    checkVictory();
}

function checkVictory() {
    const uncaptured = territories.filter(t => !t.isPlayer);
    if (uncaptured.length === 0) {
        // Grand Victory!
        audio.playVictoryFanfare();
        addLog("win", "👑 천하 통일! 모든 영토를 점령하고 진정한 대영주가 되셨습니다! 만세!");

        // Show modal
        setTimeout(() => {
            const modal = document.getElementById('victory-modal');
            const finalPowerSpan = document.getElementById('final-power');
            finalPowerSpan.textContent = playerPower;
            modal.classList.remove('hidden');
            startCelebration();
        }, 800);
    }
}

// Log utility
function addLog(type, text) {
    const logContent = document.getElementById('log-content');
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.textContent = text;
    logContent.appendChild(logItem);

    // Auto-scroll to bottom of log
    logContent.scrollTop = logContent.scrollHeight;
}

function updateUI() {
    // 1. Update power value with pulse effect
    const powerVal = document.getElementById('player-power-val');
    const currentVal = parseInt(powerVal.textContent);
    if (currentVal !== playerPower) {
        powerVal.textContent = playerPower;
        powerVal.classList.add('glow-up');
        powerVal.addEventListener('animationend', () => {
            powerVal.classList.remove('glow-up');
        }, { once: true });
    }

    // 2. Update Progress Bar
    const ownedCount = territories.filter(t => t.isPlayer).length;
    const progressPercent = (ownedCount / territories.length) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('progress-text').textContent = `${ownedCount} / ${territories.length} (${progressPercent}%)`;

    // 3. Update Player Rank/Title
    let currentRank = RANKS[0].name;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (ownedCount >= RANKS[i].threshold) {
            currentRank = RANKS[i].name;
            break;
        }
    }
    document.getElementById('player-rank-val').textContent = currentRank;

    // 4. Recalculate Node state displays
    updateNodeStates();
}

// --- Wire Event Handlers ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Game state
    initConfetti();
    initGame();

    // Reset game button
    document.getElementById('reset-btn').addEventListener('click', () => {
        audio.playClick();
        if (confirm("처음부터 다시 정벌하시겠습니까? 모든 진행 상황이 초기화됩니다.")) {
            initGame();
        }
    });

    // Mute/unmute button
    const soundBtn = document.getElementById('sound-toggle-btn');
    soundBtn.addEventListener('click', () => {
        const isMuted = audio.toggleMute();
        if (isMuted) {
            soundBtn.textContent = "🔇 효과음 꺼짐";
            soundBtn.className = "control-btn sound-off";
        } else {
            soundBtn.textContent = "🔊 효과음 켜짐";
            soundBtn.className = "control-btn sound-on";
            audio.playClick();
        }
    });

    // Clear logs button
    document.getElementById('clear-log-btn').addEventListener('click', () => {
        audio.playClick();
        document.getElementById('log-content').innerHTML = '';
    });

    // Modal restart button
    document.getElementById('restart-game-btn').addEventListener('click', () => {
        document.getElementById('victory-modal').classList.add('hidden');
        initGame();
    });

    // Modal restart button (Defeat)
    document.getElementById('restart-defeat-btn').addEventListener('click', () => {
        document.getElementById('defeat-modal').classList.add('hidden');
        initGame();
    });

    // Re-draw svg routes on window size modifications
    window.addEventListener('resize', () => {
        drawConnections();
    });
});
