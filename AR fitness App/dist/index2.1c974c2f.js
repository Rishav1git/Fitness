// HTML elements
const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("threeCanvas");
const gameOverText = document.getElementById("gameOver");
canvasElement.width = 640;
canvasElement.height = 480;
// 3D scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvasElement.width / canvasElement.height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    alpha: true
});
renderer.setSize(canvasElement.width, canvasElement.height);
camera.position.z = 5;
// Player and obstacle objects
const playerBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({
    color: 0x00ff00
}));
scene.add(playerBox);
let obstacles = [];
const obstacleSpeed = 0.05;
let squatDetected = false, jumpDetected = false, lungeDetected = false;
let isGameOver = false;
// Function to create obstacles
function createObstacle() {
    const obstacleGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const obstacleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000
    });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, camera.position.z - 10);
    obstacles.push(obstacle);
    scene.add(obstacle);
}
// Load PoseNet model and initialize webcam
async function setupCameraAndModel() {
    const net = await posenet.load();
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
    videoElement.srcObject = stream;
    // Start detecting poses and moving obstacles
    detectPoses(net);
    setInterval(createObstacle, 2000); // Spawn obstacle every 2 seconds
}
// Pose detection and movement tracking
async function detectPoses(net) {
    videoElement.onloadeddata = async ()=>{
        while(!isGameOver){
            const pose = await net.estimateSinglePose(videoElement, {
                flipHorizontal: false
            });
            if (pose.score > 0.5) trackMovement(pose);
            updateObstacles();
            detectCollisions();
            render();
            await tf.nextFrame();
        }
    };
}
// Track movements for avoiding obstacles
function trackMovement(pose) {
    const leftKnee = pose.keypoints.find((k)=>k.part === "leftKnee");
    const rightKnee = pose.keypoints.find((k)=>k.part === "rightKnee");
    const leftHip = pose.keypoints.find((k)=>k.part === "leftHip");
    const rightHip = pose.keypoints.find((k)=>k.part === "rightHip");
    const leftAnkle = pose.keypoints.find((k)=>k.part === "leftAnkle");
    const rightAnkle = pose.keypoints.find((k)=>k.part === "rightAnkle");
    if (leftKnee && rightKnee && leftHip && rightHip && leftAnkle && rightAnkle) {
        const kneeY = (leftKnee.position.y + rightKnee.position.y) / 2;
        const hipY = (leftHip.position.y + rightHip.position.y) / 2;
        const ankleY = (leftAnkle.position.y + rightAnkle.position.y) / 2;
        if (!squatDetected && hipY > kneeY + 50) {
            squatDetected = true;
            avoidObstacle("squat");
            setTimeout(()=>{
                squatDetected = false;
            }, 2000); // Reset after 2 seconds
        }
        if (!jumpDetected && ankleY < kneeY - 30) {
            jumpDetected = true;
            avoidObstacle("jump");
            setTimeout(()=>{
                jumpDetected = false;
            }, 2000); // Reset after 2 seconds
        }
        if (!lungeDetected && Math.abs(leftKnee.position.x - rightKnee.position.x) > 100) {
            lungeDetected = true;
            avoidObstacle("lunge");
            setTimeout(()=>{
                lungeDetected = false;
            }, 2000); // Reset after 2 seconds
        }
    }
}
// Check if the movement avoids an obstacle
function avoidObstacle(move) {
    if (obstacles.length > 0) {
        const nearestObstacle = obstacles[0];
        if (move === "jump" && nearestObstacle.position.y < -0.5) {
            console.log("Avoided obstacle by jumping!");
            removeObstacle(nearestObstacle);
        } else if (move === "squat" && nearestObstacle.position.y > 0.5) {
            console.log("Avoided obstacle by squatting!");
            removeObstacle(nearestObstacle);
        } else if (move === "lunge") {
            console.log("Avoided obstacle by lunging!");
            removeObstacle(nearestObstacle);
        }
    }
}
// Move obstacles towards the player and remove if passed
function updateObstacles() {
    obstacles.forEach((obstacle)=>{
        obstacle.position.z += obstacleSpeed;
    });
    obstacles = obstacles.filter((obstacle)=>obstacle.position.z < camera.position.z);
}
// Detect collision with obstacles
function detectCollisions() {
    obstacles.forEach((obstacle)=>{
        if (obstacle.position.distanceTo(playerBox.position) < 0.5) gameOver();
    });
}
// Remove obstacle from scene and array
function removeObstacle(obstacle) {
    scene.remove(obstacle);
    obstacles = obstacles.filter((obj)=>obj !== obstacle);
}
// End game
function gameOver() {
    isGameOver = true;
    gameOverText.style.display = "block";
    console.log("Game Over!");
}
// Render 3D scene
function render() {
    renderer.render(scene, camera);
}
// Initialize camera and model
setupCameraAndModel();

//# sourceMappingURL=index2.1c974c2f.js.map
