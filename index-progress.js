import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  BoxGeometry
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  CylinderGeometry,
  SphereGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  Vector2,
  Raycaster
} from "three";
import * as TWEEN from "@tweenjs/tween.js";

class Example {
  constructor() {
    this.init = this.init.bind(this);
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.bat = null;
    this.ball = null;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.gameStarted = false;
    this.pitchCount = 0;
    this.homeRuns = 0;
    this.selectedZoneIndex = 0; // Default to the first zone
    this.init();
    window.addEventListener("mousedown", this.onMouseDown);
  }

  init() {
    this.aspect = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(50, this.aspect, 1, 1000);
    this.camera.position.z = -20;
    this.camera.position.y = 4;
    this.camera.lookAt(new Vector3(0, 3, 0)); // Make the camera look at the bat and ball

    this.scene = new Scene();
    this.scene.background = new Color("#191919");
    this.scene.add(this.mesh);
    // Create bat
    const batMaterial = new MeshStandardMaterial({ color: 0x603311 });
    const batGeometry = new CylinderGeometry(0.05, 0.1, 2, 24);
    this.bat = new Mesh(batGeometry, batMaterial);
    this.bat.position.set(2, 1, 0);
    this.bat.position.y = 3 + this.selectedZoneIndex * (20 / 3);
    this.bat.rotation.z = Math.PI / 4;
    this.bat.rotation.y = 0;
    this.scene.add(this.bat);
    window.addEventListener("keydown", this.onKeyDown);

    // Create ball
    const ballMaterial = new MeshStandardMaterial({ color: 0xffffff });
    const ballGeometry = new SphereGeometry(1, 32, 32);
    this.ball = new Mesh(ballGeometry, ballMaterial);
    this.ball.position.set(0, 3, 25); // Adjust the position as needed
    this.scene.add(this.ball);
    const color = 0xffffff;
    const intensity = 1;
    const light = new AmbientLight(color, intensity);
    this.scene.add(light);
    this.createStrikeZone();

    const loader = new GLTFLoader();
    loader.load(
      "./stadium.gltf",
      function (gltf) {
        this.scene.add(gltf.scene);
      }.bind(this)
    );

    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: true
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    document.body.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.animate);
  }

  animate() {
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }

  pitchBall() {
    const pitchCountElement = document.getElementById("pitch-count");
    const startPosition = new Vector3(0, 3, 45); // Starting position of the ball
    const endPosition = new Vector3(0, 3, -5); // Position where the ball reaches the home plate
    const tween = new TWEEN.Tween(this.ball.position)
      .to(endPosition, 1000) // Adjust the duration as needed
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        this.ball.position.copy(startPosition);
        this.pitchCount++;
        if (this.pitchCount < 10) {
          // Start the countdown and the next pitch
        } else {
          this.showScore();
        }
      });
    tween.start();
    if (this.pitchCount > 0) {
      this.pitchCount--;
      pitchCountElement.textContent = `Pitches remaining: ${this.pitchCount}`;
    }
  }

  swingBat() {
    this.swingCooldown = 60; // Set a cooldown of 60 frames

    // Set the bat's Y position based on the selected zone index
    this.bat.position.y = 3 + this.selectedZoneIndex * (20 / 3);

    const startPosition = { y: -Math.PI / 4 };
    const endPosition = { y: Math.PI / 4 };
    const tween = new TWEEN.Tween(this.bat.rotation)
      .to(endPosition, 500) // Change the duration to 500ms for a slower swing
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        const resetTween = new TWEEN.Tween(this.bat.rotation)
          .to(startPosition, 500)
          .easing(TWEEN.Easing.Quadratic.In);
        resetTween.start();
      });

    tween.start();
  }

  onKeyDown(event) {
    if (event.code === "Enter" && !this.gameStarted) {
      this.startGame();
    } else if (event.code === "Space" && this.gameStarted) {
      this.swingBat();
      this.checkHitOrWhiff();
    }
  }
  startGame() {
    this.gameStarted = true;
    this.moveCamera();

    const countdownElement = document.getElementById("countdown");
    let countdownValue = 3;

    const countdownInterval = setInterval(() => {
      countdownElement.textContent = countdownValue;
      countdownValue--;

      if (countdownValue < 0) {
        clearInterval(countdownInterval);
        countdownElement.textContent = "";
        this.pitchBall();
      }
    }, 1000);
  }

  moveCamera() {
    const tween = new TWEEN.Tween(this.camera.position)
      .to({ x: 0, y: 12, z: -45 }, 2000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        this.camera.lookAt(new Vector3(0, 3, 0)); // Make the camera look at the bat and ball
        // Start the countdown and the game loop here
      })
      .start();
  }

  onMouseDown(event) {
    // Update the selected zone based on user click
    // You can use raycasting to detect which part of the batter's box is clicked.
    // For simplicity, let's assume there are three buttons representing the high, middle, and low zones
    if (event.target.id === "highButton") {
      this.selectedZone = "high";
    } else if (event.target.id === "middleButton") {
      this.selectedZone = "middle";
    } else if (event.target.id === "lowButton") {
      this.selectedZone = "low";
    }
  }

  checkHitOrWhiff() {
    // Check if the swing timing is correct
    if (this.isSwingTimingCorrect()) {
      this.homeRuns++;
      this.hitAnimation();
    } else {
      this.whiffAnimation();
    }
  }

  isSwingTimingCorrect() {
    // Check if the swing timing is correct (adjust the threshold as needed)
    const correct = Math.abs(this.ball.position.z) < 5;

    if (correct) {
      const scoreboardElement = document.getElementById("scoreboard");
      this.hits++;
      scoreboardElement.textContent = `Hits: ${this.hits}`;
    }

    return correct;
  }

  createStrikeZone() {
    const rowHeight = 20 / 3;
    const strikeZoneWidth = 10;
    const strikeZoneMaterial = new MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.5
    });
    const selectedMaterial = new MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5
    });

    const strikeZoneGeometry = new BoxGeometry(2, 2, 1);
    this.strikeZones = [];

    for (let i = 0; i < 3; i++) {
      const strikeZone = new Mesh(
        strikeZoneGeometry,
        strikeZoneMaterial.clone()
      );
      strikeZone.position.set(0, rowHeight / 2 + rowHeight * i, 1);
      this.scene.add(strikeZone);
      this.strikeZones.push(strikeZone);
    }

    const raycaster = new Raycaster();
    const mouse = new Vector2();

    const onClick = (event) => {
      event.preventDefault();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);

      const intersects = raycaster.intersectObjects(this.strikeZones);

      if (intersects.length > 0) {
        const zone = intersects[0].object;
        this.selectedZoneIndex = this.strikeZones.indexOf(zone);

        this.strikeZones.forEach((sz) => {
          if (sz === zone) {
            sz.material = selectedMaterial;
            sz.material.needsUpdate = true;
          } else {
            sz.material = strikeZoneMaterial;
            sz.material.needsUpdate = true;
          }
        });
      }
    };

    window.addEventListener("click", onClick);
  }

  hitAnimation() {
    const startPosition = new Vector3().copy(this.ball.position);
    const endPosition = new Vector3(0, 50, -200); // Position where the ball flies out of the park
    const tween = new TWEEN.Tween(this.ball.position)
      .to(endPosition, 2000) // Adjust the duration as needed
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        this.ball.position.copy(startPosition);
      });
    tween.start();
  }

  whiffAnimation() {
    // Animate a whiff (e.g., a particle effect or a text message)
    console.log("Whiff");
  }

  showScore() {
    // Display the score (e.g., using an HTML element or a Three.js TextGeometry)
    alert(`You scored ${this.homeRuns} home runs!`);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new Example();
