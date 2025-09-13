window.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const numProcInput = document.getElementById('numProcesses');
  const generateBtn = document.getElementById('generateBtn');
  const processInputsDiv = document.getElementById('processInputs');
  const timeQuantumInput = document.getElementById('timeQuantum');
  const speedInput = document.getElementById('speed');
  const loadBtn = document.getElementById('loadBtn');
  const stepBtn = document.getElementById('stepBtn');
  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');

  const cpuPid = document.getElementById('cpuPid');
  const cpuSub = document.getElementById('cpuSub');
  const readyQueueDiv = document.getElementById('readyQueue');
  const statsBody = document.getElementById('statsBody');
  const ganttTrack = document.getElementById('ganttTrack');
  const ganttTimeline = document.getElementById('ganttTimeline');
  const explainDiv = document.getElementById('explain');
  const timeNowDiv = document.getElementById('timeNow');
  const avgWaitingSpan = document.getElementById('avgWaiting');
  const avgTurnSpan = document.getElementById('avgTurn');

  const colors = ['#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#fbbf24', '#14b8a6', '#ec4899'];
  const genColor = pid => colors[(pid - 1) % colors.length];

  let processes = [];
  let readyQueue = [];
  let currentTime = 0;
  let quantum = 2;
  let speed = 650;
  let running = false;
  let completedCount = 0;
  let timer = null;

  generateBtn.addEventListener('click', () => {
    const n = parseInt(numProcInput.value, 10);
    if (!n || n < 1) {
      alert('Enter valid number of processes!');
      return;
    }
    processInputsDiv.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const div = document.createElement('div');
      div.className = 'input-row';
      div.innerHTML = `
        <label>PID ${i + 1} Burst:</label>
        <input type="number" min="1" class="burst" placeholder="Burst time" required>
        <label>Arrival:</label>
        <input type="number" min="0" class="arrival" value="0" required>
      `;
      processInputsDiv.appendChild(div);
    }
    loadBtn.disabled = false;
    stepBtn.disabled = true;
    playBtn.disabled = true;
    explainDiv.textContent = 'Enter burst and arrival values, then click Load.';
  });

  loadBtn.addEventListener('click', () => {
    if (running) return;
    const burstInputs = document.querySelectorAll('.burst');
    const arrivalInputs = document.querySelectorAll('.arrival');
    processes = [];
    for (let i = 0; i < burstInputs.length; i++) {
      const burst = parseInt(burstInputs[i].value, 10);
      const arrival = parseInt(arrivalInputs[i].value, 10);
      if (isNaN(burst) || burst < 1 || isNaN(arrival) || arrival < 0) {
        alert(`Check process ${i + 1} input!`);
        return;
      }
      processes.push({
        pid: i + 1,
        burst,
        arrival,
        remaining: burst,
        waiting: 0,
        turnaround: 0,
        finished: false,
        enqueued: false
      });
    }
    quantum = Math.max(1, parseInt(timeQuantumInput.value, 10) || 2);
    speed = Math.max(100, parseInt(speedInput.value, 10) || 650);
    resetSimulationState();
    stepBtn.disabled = false;
    playBtn.disabled = false;
    explainDiv.textContent = 'Processes loaded. Step or Play to run simulation.';
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('Reset and clear simulation?')) {
      stopSimulation();
      resetAll();
    }
  });

  stepBtn.addEventListener('click', async () => {
    if (!running) await doStep();
  });

  playBtn.addEventListener('click', () => {
    if (!processes.length) return alert('Load processes first.');
    if (running) stopSimulation();
    else runSimulation();
  });

  function toggleControls(enable) {
    [numProcInput, generateBtn, loadBtn, stepBtn, playBtn, timeQuantumInput, speedInput].forEach(e => e.disabled = !enable);
  }

  function resetSimulationState() {
    currentTime = 0;
    completedCount = 0;
    readyQueue = [];
    processes.forEach(p => {
      p.remaining = p.burst;
      p.waiting = 0;
      p.turnaround = 0;
      p.finished = false;
      p.enqueued = false;
    });
    ganttTrack.innerHTML = '';
    ganttTimeline.innerHTML = '';
    cpuPid.textContent = '—';
    cpuSub.textContent = 'Idle';
    readyQueueDiv.innerHTML = '';
    updateTime();
    renderStatsTable();
  }

  function resetAll() {
    processes = [];
    readyQueue = [];
    currentTime = 0;
    completedCount = 0;
    running = false;
    timer && clearTimeout(timer);
    timer = null;
    ganttTrack.innerHTML = '';
    ganttTimeline.innerHTML = '';
    cpuPid.textContent = '—';
    cpuSub.textContent = 'Idle';
    readyQueueDiv.innerHTML = '';
    statsBody.innerHTML = '';
    avgWaitingSpan.textContent = '0.00';
    avgTurnSpan.textContent = '0.00';
    updateTime();
    stepBtn.disabled = true;
    playBtn.disabled = true;
    loadBtn.disabled = true;
    toggleControls(true);
    explainDiv.textContent = 'Generate processes to begin.';
  }

  function updateReadyQueue() {
    readyQueueDiv.innerHTML = '';
    readyQueue.forEach(idx => {
      const p = processes[idx];
      const div = document.createElement('div');
      div.className = 'proc';
      div.style.backgroundColor = genColor(p.pid);
      div.innerHTML = `<div><strong>P${p.pid}</strong></div><div style="font-size:0.9em;">${p.remaining}</div>`;
      readyQueueDiv.appendChild(div);
    });
  }

  function updateTime() {
    timeNowDiv.textContent = `t = ${currentTime}`;
  }

  function renderStatsTable() {
    statsBody.innerHTML = '';
    let totalWait = 0, totalTurn = 0;
    processes.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>P${p.pid}</td>
        <td>${p.burst}</td>
        <td>${p.arrival}</td>
        <td>${p.remaining}</td>
        <td>${p.waiting}</td>
        <td>${p.finished ? p.turnaround : '-'}</td>
      `;
      statsBody.appendChild(tr);
      totalWait += p.waiting;
      totalTurn += p.finished ? p.turnaround : 0;
    });
    avgWaitingSpan.textContent = (totalWait / processes.length).toFixed(2);
    avgTurnSpan.textContent = (totalTurn / processes.length).toFixed(2);
  }

  function addGanttBlock(pid, len, startTime, isFinished) {
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.textContent = `P${pid}`;
    block.style.minWidth = `${40 * len}px`;
    block.style.background = isFinished ? 'linear-gradient(180deg,#ffd6d6,#fb7185)' : `linear-gradient(180deg, ${genColor(pid)}, #60a5fa)`;
    ganttTrack.appendChild(block);
  }

  // == MINIMAL TIMELINE FIX: Replace this function only ==
  function updateGanttTimeline() {
    ganttTimeline.innerHTML = '';
    let current = 0;
    Array.from(ganttTrack.children).forEach(block => {
      const blockWidth = parseInt(block.style.minWidth, 10) || 40;
      const duration = blockWidth / 40;
      const label = document.createElement('div');
      label.className = 'gantt-time';
      label.style.width = block.style.minWidth;
      label.style.display = 'inline-block';
      label.style.textAlign = 'left';
      label.textContent = current;
      ganttTimeline.appendChild(label);
      current += duration;
    });
    // Add final tick for simulation end
    const endLab = document.createElement('div');
    endLab.className = 'gantt-time';
    endLab.style.width = '40px';
    endLab.style.display = 'inline-block';
    endLab.style.textAlign = 'left';
    endLab.textContent = current;
    ganttTimeline.appendChild(endLab);
  }
  // == End MINIMAL TIMELINE FIX ==

  async function runExecution(idx, quantumTime, startTime) {
    const p = processes[idx];
    cpuPid.textContent = `P${p.pid}`;
    cpuSub.textContent = `Running (${quantumTime})`;
    await new Promise(r => setTimeout(r, speed * quantumTime));
    cpuPid.textContent = '—';
    cpuSub.textContent = 'Idle';
    addGanttBlock(p.pid, quantumTime, startTime, p.remaining - quantumTime <= 0);
    updateGanttTimeline();
  }

  function enqueueArrivals() {
    processes.forEach((p, idx) => {
      if (!p.enqueued && !p.finished && p.arrival <= currentTime) {
        p.enqueued = true;
        readyQueue.push(idx);
      }
    });
  }

  async function doStep() {
    enqueueArrivals();

    if (readyQueue.length === 0) {
      const future = processes.filter(p => !p.finished && !p.enqueued).map(p => p.arrival);
      if (future.length === 0) {
        explainDiv.textContent = 'All processes completed.';
        updateReadyQueue();
        renderStatsTable();
        updateTime();
        computeAverages();
        return;
      }
      currentTime = Math.min(...future);
      enqueueArrivals();
      updateReadyQueue();
      updateTime();
      explainDiv.textContent = `Time advanced to ${currentTime}`;
      return;
    }

    const idx = readyQueue.shift();
    const p = processes[idx];
    if (p.finished) return;

    const quantumUsed = Math.min(quantum, p.remaining);
    readyQueue.forEach(i => processes[i].waiting += quantumUsed);

    explainDiv.textContent = `t=${currentTime}: Running P${p.pid} for ${quantumUsed}`;
    await runExecution(idx, quantumUsed, currentTime);

    currentTime += quantumUsed;
    p.remaining -= quantumUsed;

    if (p.remaining <= 0) {
      p.finished = true;
      p.turnaround = currentTime - p.arrival;
      completedCount++;
      explainDiv.textContent = `P${p.pid} finished at t=${currentTime}`;
    } else {
      enqueueArrivals();
      readyQueue.push(idx);
      explainDiv.textContent = `P${p.pid} preempted; remaining ${p.remaining}`;
    }

    updateReadyQueue();
    renderStatsTable();
    updateTime();

    if (completedCount === processes.length) {
      explainDiv.textContent = 'All processes completed.';
      computeAverages();
      stopSimulation();
    }
  }

  async function runSimulation() {
    running = true;
    toggleControls(false);
    playBtn.textContent = 'Pause';
    playBtn.classList.add('active');
    while (running && completedCount < processes.length) {
      await doStep();
      await new Promise(r => setTimeout(r, 100));
    }
    toggleControls(true);
    running = false;
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
  }

  function stopSimulation() {
    running = false;
    toggleControls(true);
    playBtn.textContent = 'Play';
    playBtn.classList.remove('active');
    timer && clearTimeout(timer);
    timer = null;
  }

  function computeAverages() {
    const totalWait = processes.reduce((a, p) => a + p.waiting, 0);
    const totalTurn = processes.reduce((a, p) => a + (p.turnaround || 0), 0);
    avgWaitingSpan.textContent = (totalWait / processes.length).toFixed(2);
    avgTurnSpan.textContent = (totalTurn / processes.length).toFixed(2);
  }

  function init() {
    resetAll();
  }

  init();
});
