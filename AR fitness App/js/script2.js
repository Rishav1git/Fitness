import * as THREE from 'three';

let scene, camera, renderer;
let player, coins = [], obstacles = [];
let score = 0;
let moveSpeed = 0.1; // Forward speed
let coinCount = 10;
let obstacleCount = 5;
let spawnDistance = 100; // Distance ahead of player to spawn new objects
let removeDistance = 5; // Distance behind the player to remove old objects
let sceneLength = 110;
let winLength = 500;
let jumpHeight = 1.5;
let duckHeight = 0.5;
let isJumping = false;
let isDucking = false;
let isGameOver = false;
const videoElement = document.getElementById('webcam');
let net;

// Update the score display
function updateScore() {
    document.getElementById('scoreboard').textContent = `Score: ${score}`;
}

function startGame() {
    const winLengthInput = document.getElementById('winLength').value;
    winLength = parseInt(winLengthInput) || 500; // Default to 500 if input is empty or invalid
    init();
}

// Initialize Three.js scene, camera, and renderer
function init() {
    const canvas = document.getElementById('threeCanvas');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Ground plane with brown color
    const groundGeometry = new THREE.PlaneGeometry(5, 1000);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Player setup
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = 0.5;
    scene.add(player);

    // Position the camera
    camera.position.set(0, 5, 10);
    camera.lookAt(player.position);

    // Initial coins, obstacles, and trees
    generateCoinsAndObstacles(obstacleCount, coinCount);

    // Event listener for dodging left and right
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    setupCameraAndModel();
    animate();
}

// Handle player movement for dodging
function handleKeyDown(move) {
    if (move === 'jump' && !isJumping) {
        isJumping = true;
        player.position.y += jumpHeight;
    } else if (move === 'squat' && !isDucking) {
        isDucking = true;
        player.scale.y = duckHeight;
    }

    setTimeout(() => handleKeyUp(move), 2000);
}

function handleKeyUp(move) {
    if (move === 'jump' && isJumping) {
        isJumping = false;
        player.position.y = 0.5;
    } else if (move === 'squat' && isDucking) {
        isDucking = false;
        player.scale.y = 1;
    }
}

// Generate coins and obstacles
function generateCoinsAndObstacles(obstacleCount, coinCount) {
    let coinZPosition = player.position.z - 30;
    let obstacleZPosition = player.position.z - 30;

    for (let i = 0; i < coinCount; i++) {
        const coinGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const coinMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);

        coinZPosition -= spawnDistance / coinCount;
        coin.position.set(0, 0.5, coinZPosition - Math.random() * 2);
        
        scene.add(coin);
        coins.push(coin);
    }

    for (let i = 0; i < obstacleCount; i++) {
        let height = Math.random() + 0.5;
        const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
        const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x416346 });
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

        obstacleZPosition -= spawnDistance / obstacleCount;
        obstacle.position.set(0, height, obstacleZPosition - Math.random() * 2);
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

// Check for coin collection and collisions
function checkCollisions() {
    coins.forEach((coin, index) => {
        if (player.position.distanceTo(coin.position) < 1) {
            scene.remove(coin);
            coins.splice(index, 1);
            score++;
            updateScore();
        }
    });
    obstacles.forEach((obstacle, index) => {
        if (player.position.distanceTo(obstacle.position) < 1) {
            if ((obstacle.position.y > 1 && (isJumping || !isDucking)) || (obstacle.position.y < 1 && (isDucking || !isJumping))) {
                isGameOver = true;
                alert("Game Over! You hit an obstacle.");
                resetGame();
            }
        }
    });
}

// Remove coins and obstacles that are behind the player
function removeOldObjects() {
    coins = coins.filter(coin => {
        if (coin.position.z > player.position.z + removeDistance) {
            scene.remove(coin);
            return false;
        }
        return true;
    });

    obstacles = obstacles.filter(obstacle => {
        if (obstacle.position.z > player.position.z + removeDistance) {
            scene.remove(obstacle);
            return false;
        }
        return true;
    });
}

async function setupCameraAndModel() {
    net = await posenet.load();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;

    detectPoses();
}

// Pose detection and movement tracking
async function detectPoses() {
    videoElement.onloadeddata = async () => {
        while (!isGameOver) {
            const pose = await net.estimateSinglePose(videoElement, { flipHorizontal: false });
            // if (pose.score > 0.8)
            // console.log(pose)
            trackMovement(pose);
            await tf.nextFrame();
        }
    };
}

// Track movements for avoiding obstacles
let kneeYAvg = [0, 0, 0], hipYAvg = [0, 0, 0];

let prevposition = null;

function trackMovement(pose) {
    const leftKnee = pose.keypoints.find(k => k.part === 'leftKnee');
    const rightKnee = pose.keypoints.find(k => k.part === 'rightKnee');
    const leftHip = pose.keypoints.find(k => k.part === 'leftHip');
    const rightHip = pose.keypoints.find(k => k.part === 'rightHip');
    const leftAnkle = pose.keypoints.find(k => k.part === 'leftAnkle');
    const rightAnkle = pose.keypoints.find(k => k.part === 'rightAnkle');
    
    kneeYAvg.shift();
    kneeYAvg.push((leftKnee.position.y + rightKnee.position.y) / 2);
    const kneeY = kneeYAvg.reduce((a, b) => a + b) / kneeYAvg.length;
    
    hipYAvg.shift();
    hipYAvg.push((leftHip.position.y + rightHip.position.y) / 2);
    const hipY = hipYAvg.reduce((a, b) => a + b) / hipYAvg.length;
    
    const currentposition = (leftAnkle.position.y + rightAnkle.position.y) / 2;
    
    if (leftKnee.score > 0.6 && rightKnee.score > 0.6 && leftHip.score > 0.6 && rightHip.score > 0.6 && leftAnkle.score > 0.6 && rightAnkle.score > 0.6) {
        // console.log(kneeY,hipY)
        // Check for squat
        if (hipY > kneeY) {
            handleKeyDown("squat");
            avoidObstacle("squat");
        }

        // Check for jump using the absolute difference
        if (prevposition !== null && Math.abs(prevposition - currentposition) > 30) {
            handleKeyDown("jump");
            avoidObstacle("jump");
        }
    }
    prevposition = currentposition;
    console.log(Math.abs(prevposition-currentposition))
}




// Check if the movement avoids an obstacle
function avoidObstacle(move) {
    if (move === "jump") {
        console.log("Avoided obstacle by jumping!");
    } else {
        console.log("Avoided obstacle by squatting!");
    }
}

// Reset the game on collision
function resetGame() {
    score = 0;
    isGameOver = false;
    player.position.set(0, 0.5, 0);
    updateScore();
    window.location.reload();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    player.position.z -= moveSpeed;
    camera.position.z = player.position.z + 10;

    checkCollisions();
    detectPoses(net);
    removeOldObjects();

    if (Math.abs(player.position.z) >= sceneLength) {
        sceneLength += 110;
        generateCoinsAndObstacles(obstacleCount, coinCount);
    }
    
    if (Math.abs(player.position.z) >= winLength) {
        alert("Hurray! You won the game!");
        resetGame();
    }

    renderer.render(scene, camera);
}
window.startGame = startGame;
