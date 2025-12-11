/* global tmPose */ // Teachable Machine pose library from script tag

// Part 3: 1. Variables for the model and webcam
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/_b238YfqS/";
let model, webcam, ctx;
let currentDirection = "Neutral";
let currentConfidence = 0;

// Part 5: 1. Smoothing and thresholds
const MOVE_THRESHOLD = 0.7;      // only move if prob >= 0.7
const STABLE_FRAMES = 3;         // require same prediction for a few frames
let stableDirection = "Neutral";
let sameDirectionCount = 0;

// Part 5: 2. Movement rate (ms between moves)
const MOVE_INTERVAL_MS = 400;
let moveIntervalId = null;

// Part 4: 1. Maze represented as a 2D array (0,1,2,3)
const maze = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 0, 1, 1, 1, 0, 1, 3, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Part 4: 2. Player position stored as grid coordinates (row, col)
let playerRow = 0;
let playerCol = 0;

let mazeCanvas, mazeCtx;
let cellSize = 40;

// Part 3: 2. Load the Teachable Machine model from the local folder
async function loadModel() {
  const modelURL = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
}

// Part 3: 3. Initialize the webcam
async function setupWebcam() {
  const flip = true;
  webcam = new tmPose.Webcam(320, 240, flip);

  await webcam.setup();
  await webcam.play();

  const canvas = document.getElementById("canvas");
  canvas.width = 320;
  canvas.height = 240;
  ctx = canvas.getContext("2d");

  window.requestAnimationFrame(loop);
}

// Part 3: 4. Prediction loop that runs on animation frames
async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// Part 3 + Part 5: prediction, smoothing, and user feedback
async function predict() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  let bestClass = "Neutral";
  let bestProb = 0;

  for (let i = 0; i < prediction.length; i++) {
    if (prediction[i].probability > bestProb) {
      bestProb = prediction[i].probability;
      bestClass = prediction[i].className;
    }
  }

  currentDirection = bestClass;
  currentConfidence = bestProb;

  // Part 5: smoothing + threshold
  if (bestProb >= MOVE_THRESHOLD) {
    if (bestClass === stableDirection) {
      sameDirectionCount++;
    } else {
      stableDirection = bestClass;
      sameDirectionCount = 1;
    }
  } else {
    stableDirection = "Neutral";
    sameDirectionCount = 0;
  }

  // Draw pose on webcam canvas
  ctx.drawImage(webcam.canvas, 0, 0);
  if (pose) {
    const minPartConfidence = 0.5;
    tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
    tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
  }

  // Part 5: continuous user feedback
  const predDiv = document.getElementById("prediction");
  predDiv.textContent =
    "Prediction: " +
    currentDirection +
    " (" +
    currentConfidence.toFixed(2) +
    ") | Stable: " +
    stableDirection;
}

// Part 4: Initialize maze canvas, compute player start, and draw the grid
function initMaze() {
  mazeCanvas = document.getElementById("mazeCanvas");
  mazeCtx = mazeCanvas.getContext("2d");

  cellSize = Math.min(
    Math.floor(mazeCanvas.width / maze[0].length),
    Math.floor(mazeCanvas.height / maze.length)
  );

  // Find player start position (value 2)
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      if (maze[r][c] === 2) {
        playerRow = r;
        playerCol = c;
      }
    }
  }

  drawMaze();
}

// Part 4: Draw the maze grid, walls, goal, and player
function drawMaze() {
  mazeCtx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);

  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      const cell = maze[r][c];
      const x = c * cellSize;
      const y = r * cellSize;

      if (cell === 1) {
        mazeCtx.fillStyle = "#333";        // wall
      } else if (cell === 3) {
        mazeCtx.fillStyle = "#4caf50";     // goal
      } else {
        mazeCtx.fillStyle = "#ffffff";     // empty / start
      }
      mazeCtx.fillRect(x, y, cellSize, cellSize);

      mazeCtx.strokeStyle = "#bbbbbb";
      mazeCtx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // draw player
  const px = playerCol * cellSize + cellSize / 2;
  const py = playerRow * cellSize + cellSize / 2;
  const radius = cellSize / 3;

  mazeCtx.fillStyle = "#0000ff";
  mazeCtx.beginPath();
  mazeCtx.arc(px, py, radius, 0, Math.PI * 2);
  mazeCtx.fill();
}

// Part 5: move the player at a controlled rate using the stableDirection
function movePlayerFromGesture() {
  // require direction to be stable for some frames
  if (sameDirectionCount < STABLE_FRAMES) return;

  let dRow = 0;
  let dCol = 0;

  if (stableDirection === "PointLeft") dCol = -1;
  else if (stableDirection === "PointRight") dCol = 1;
  else if (stableDirection === "PointUp") dRow = -1;
  else if (stableDirection === "PointDown") dRow = 1;
  else return; // Neutral or unknown → no movement

  const newRow = playerRow + dRow;
  const newCol = playerCol + dCol;

  // bounds + wall check
  if (
    newRow < 0 ||
    newRow >= maze.length ||
    newCol < 0 ||
    newCol >= maze[0].length
  ) {
    return;
  }
  if (maze[newRow][newCol] === 1) {
    return; // wall → don't move
  }

  playerRow = newRow;
  playerCol = newCol;
  drawMaze();

  // Reached goal
  if (maze[newRow][newCol] === 3) {
    const predDiv = document.getElementById("prediction");
    predDiv.textContent = "Goal reached! 🎉";
  }
}

// Start button: load model, setup webcam, and start movement timer
document.addEventListener("DOMContentLoaded", () => {
  initMaze(); // Part 4: set up the grid and player start

  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", async () => {
    console.log("Start button clicked");

    try {
      console.log("Loading model from:", MODEL_URL);
      await loadModel();
      console.log("Model loaded");

      await setupWebcam();
      console.log("Webcam setup complete");

      // Part 5: movement rate control (every 400 ms)
      if (!moveIntervalId) {
        moveIntervalId = setInterval(movePlayerFromGesture, MOVE_INTERVAL_MS);
        console.log("Movement interval started");
      }
    } catch (err) {
      console.error("Error starting camera or model:", err);
      alert("Error starting camera or model:\n" + err);
    }
  });
});
