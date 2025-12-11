README — Gesture Controlled Maze

1) How to Run the Project

Open the folder in Visual Studio Code.

Right-click index.html → Open with Live Server.
(TensorFlow.js requires a local server to load model files.)

When the page loads, click “Start Camera & Model” and allow webcam access.

The character in the maze will move according to detected hand gestures:

PointLeft → move left

PointRight → move right

PointUp → move up

PointDown → move down

Neutral → no movement

2) How the Model Was Trained

The gesture classifier was created using Google Teachable Machine (Pose Model).

Five gesture classes were used:

Neutral, PointLeft, PointRight, PointUp, PointDown

Training data was collected using the laptop webcam, with variations in distance and hand position.

Approximate sample counts per class:

Neutral: ~120

PointLeft: ~130

PointRight: ~140

PointUp: ~144

PointDown: ~171

The model was trained using default settings and validated through the live preview.

Exported as a TensorFlow.js model and placed in the tmModel/ folder for browser integration.

3) Known Limitations & Quirks

Lighting sensitivity: Bright or uneven lighting may reduce recognition accuracy.

Prediction smoothing: A confidence threshold is applied and predictions must remain stable for a few frames; this avoids jitter but may delay movement slightly.

Movement pacing: Player movement is limited to one step every ~400ms to maintain control and prevent skipping through the maze.

Camera positioning: Gestures may not register if the hand is too close, too far, or partially out of frame.

Browser compatibility: Works best in Chrome or Edge; other browsers may behave differently with TensorFlow.js.
