// HTML elements
const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("threeCanvas");
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
// Reward object (a rotating box)
const boxGeometry = new THREE.BoxGeometry();
const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00
});
const rewardBox = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(rewardBox);
// Track fitness activity
let squatDetected = false;
let jumpDetected = false;
let lungeDetected = false;
// Load PoseNet model and initialize webcam
async function setupCameraAndModel() {
    const net = await posenet.load();
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
    videoElement.srcObject = stream;
    // Start detecting poses
    detectPoses(net);
}
// Pose detection and movement tracking
async function detectPoses(net) {
    videoElement.onloadeddata = async ()=>{
        while(true){
            const pose = await net.estimateSinglePose(videoElement, {
                flipHorizontal: false
            });
            if (pose.score > 0.5) trackMovement(pose);
            render();
            await tf.nextFrame();
        }
    };
}
// Movement tracking function
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
        // Detect squat (hips below knees)
        if (!squatDetected && hipY > kneeY + 50) {
            squatDetected = true;
            showReward("Squat detected!");
            setTimeout(()=>{
                squatDetected = false;
            }, 2000); // Reset after 2 seconds
        }
        // Detect jump (ankles above knees)
        if (!jumpDetected && ankleY < kneeY - 30) {
            jumpDetected = true;
            showReward("Jump detected!");
            setTimeout(()=>{
                jumpDetected = false;
            }, 2000); // Reset after 2 seconds
        }
        // Detect lunge (distance between knees increases)
        const kneeDistance = Math.abs(leftKnee.position.x - rightKnee.position.x);
        if (!lungeDetected && kneeDistance > 100) {
            lungeDetected = true;
            showReward("Lunge detected!");
            setTimeout(()=>{
                lungeDetected = false;
            }, 2000); // Reset after 2 seconds
        }
    }
}
// Display reward animation
function showReward(message) {
    console.log(message);
    rewardBox.material.color.set(Math.random() * 0xffffff); // Change color
}
// Render 3D scene
function render() {
    rewardBox.rotation.x += 0.01;
    rewardBox.rotation.y += 0.01;
    renderer.render(scene, camera);
}
// Initialize camera and model
setupCameraAndModel();

//# sourceMappingURL=index.1c974c2f.js.map
