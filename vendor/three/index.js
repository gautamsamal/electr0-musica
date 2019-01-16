/**
 * Accepts analyser node of a audio context and draws visualization.
 * @param {AnalyzerNode} analyser
 */

function setupVS(analyser) {
  //Code for WebAudioAPI.
  // let context = new (window.AudioContext || window.webkitAudioContext)();
  // let analyser = context.createAnalyser();
  let soundDataArray;

  const MAX_SOUND_VALUE = 256;

  //When the user chooses audio to visualise, this function is called.
  //It starts playing the music, hides the input, and calls createAudioObjects.
  // audioInput.onchange = function () {
  // let sound = document.getElementById("sound");
  // let reader = new FileReader();
  // reader.onload = function (e) {
  // sound.src = this.result;
  // sound.controls = true;
  // sound.play();
  // };
  // reader.readAsDataURL(this.files[0]);
  // createAudioObjects();
  // };

  //Connects the audio source to the analyser and creating a suitably sized array to hold the frequency data.
  function createAudioObjects() {
    // source = context.createMediaElementSource(document.getElementById("sound"));
    // source.connect(analyser);
    // analyser.connect(context.destination);
    analyser.fftSize = 1024; //128, 256, 512, 1024 and 2048 are valid values.
    let bufferLength = analyser.frequencyBinCount;
    soundDataArray = new Uint8Array(bufferLength);
  }

  //Returns the average of a small sample of the array. Index declares which sample you want, ideal for iteration.
  function getSampleOfSoundData(index, noSampleSections, soundDataArray) {
    let sampleSize = Math.floor((soundDataArray.length / 2) / noSampleSections);

    let minBound = index * sampleSize;
    let maxBound = (index + 1) * sampleSize;
    let sum = 0;

    for (let i = minBound; i < maxBound; i++) {
      sum += soundDataArray[i];
    }
    let average = sum / sampleSize;

    return average / MAX_SOUND_VALUE;
  }

  //Code for THREE js scene setup.
  window.scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  let renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  document.getElementById('anim').appendChild(renderer.domElement);

  camera.position.z = 90;
  camera.position.x = 0;
  camera.position.y = 0;

  //Creation of the geometry, material and line arrays
  let segmentGeometryArray = [];
  let segmentMaterialArray = [];
  let segmentsArray = [];
  setUpAllArrays();
  createSkybox();

  // adds lights
  function addLights() {
    var intensity = 400;
    var distance = 120;
    var decay = 2.0;
    var colors = [0xff0040, 0x0040ff, 0x80ff80, 0xffaa00, "purple", "blue", "red", "green"];
    var lightSphere = new THREE.SphereBufferGeometry(1, 16, 8);
    lights = [];
    for (var i = 0; i < 16; i++) {
      lights[i] = new THREE.PointLight(colors[i % 8], intensity, distance, decay);
      // lights[i].add(new THREE.Mesh(lightSphere, new THREE.MeshStandardMaterial({ color: colors[i % 8] })));
      scene.add(lights[i]);
    }
    var dlight = new THREE.DirectionalLight(0xffffff, 0.05);
    dlight.position.set(0, 0, 0).normalize();
    scene.add(dlight);
  }

  // add white lights for the scene
  function setWhiteLights() {
    var lightIntensity = 200;
    var distance = 100;
    var decay = 2.0;
    var whiteLights = [];
    positions = [{ x: 0, y: 0, z: 90 },
    { x: 0, y: 90, z: 0 },
    { x: 90, y: 0, z: 0 },
    { x: 90, y: 0, z: 90 },
    { x: 90, y: 90, z: 0 },
    { x: 90, y: 0, z: 90 },
    { x: 0, y: -90, z: 0 },
    { x: -90, y: 0, z: 0 },
    { x: 0, y: 0, z: -90 },]

    for (var i = 0; i < positions.length; i++) {
      whiteLights[i] = new THREE.PointLight("pink", lightIntensity, distance, decay);
      whiteLights[i].position.set(positions[i].x, positions[i].y, positions[i].z);
      scene.add(whiteLights[i]);
    }
  }


  //Makes a subtle grey background.
  function createSkybox() {
    let sphereBox = new THREE.SphereGeometry(500, 32, 32);
    let sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 1.0 });
    let sphere = new THREE.Mesh(sphereBox, sphereMaterial);
    scene.add(sphere);

    addLights();
    setWhiteLights();
  }

  var theta;
  //Creates all the geometries, materials and meshes, properties of which are animated later.
  function setUpAllArrays() {
    for (let i = 0; i < 7; i++) {

      theta = i == 0 ? 0 : (theta + 360 / 7);

      segmentGeometryArray.push(new THREE.SphereGeometry(2, 50, 50, 0, Math.PI * 2, 0, Math.PI * 2));

      segmentMaterialArray.push(new THREE.MeshStandardMaterial({
        color: new THREE.Color(color = "hsl(" + Math.random() * 360 + ", 90%, 40%)"),
        roughness: 0.2, metalness: 1.0
      }));

      segmentsArray.push(new THREE.Mesh(segmentGeometryArray[i], segmentMaterialArray[i]));
      segmentsArray[i].theta = theta;
      segmentsArray[i].position.x = 20 * Math.cos(theta * Math.PI / 180);
      segmentsArray[i].position.y = 20 * Math.sin(theta * Math.PI / 180);
      segmentsArray[i].position.z = 0;

      scene.add(segmentsArray[i]);
    }

    var r = 20;
    for (let j = 7; j < 21; j++) {

      if (j % 7 == 0) {
        r += 25;
      }
      theta = j == 7 ? 0 : (theta + 360 / 7);
      if (j == 14) {
        theta += 25;
      }
      segmentGeometryArray.push(new THREE.SphereGeometry(3, 50, 50, 0, Math.PI * 2, 0, Math.PI * 2));

      segmentMaterialArray.push(new THREE.MeshStandardMaterial({
        color: new THREE.Color(color = "hsl(" + Math.random() * 360 + ", 90%, 40%)"),
        roughness: 0.2, metalness: 1.0
      }));

      segmentsArray.push(new THREE.Mesh(segmentGeometryArray[j], segmentMaterialArray[j]));
      segmentsArray[j].theta = theta;
      segmentsArray[j].position.x = r * Math.cos(theta * Math.PI / 180);
      segmentsArray[j].position.y = r * Math.sin(theta * Math.PI / 180);
      segmentsArray[j].position.z = 0;
      segmentsArray[j].r = r;
      scene.add(segmentsArray[j]);
    }

    // middle sphere
    segmentGeometryArray.push(new THREE.SphereGeometry(4, 50, 50, 0, Math.PI * 2, 0, Math.PI * 2));

    segmentMaterialArray.push(new THREE.MeshStandardMaterial({
      color: new THREE.Color("pink"),
      roughness: 0.2, metalness: 1.0, wireframe: true
    }));

    segmentsArray.push(new THREE.Mesh(segmentGeometryArray[21], segmentMaterialArray[21]));
    segmentsArray[21].position.x = 0;
    segmentsArray[21].position.y = 0;
    segmentsArray[21].position.z = 0;

    scene.add(segmentsArray[21]);
  }

  function resetArrays() {
    segmentGeometryArray = [];
    segmentMaterialArray = [];
    segmentsArray = [];

    //Code to remove all objects from a scene.
    for (var i = scene.children.length - 1; i >= 0; i--) {
      obj = scene.children[i];
      scene.remove(obj);
    }

    createSkybox();
    setUpAllArrays();
  }

  var startDate = new Date();
  //Code to animate the visualisation.
  function updateMeshes() {

    let sampleLevel = 0.5;
    //Carefully access the soundDataArray, as it doesn't exist until the user selects a sound file.
    if ((soundDataArray === undefined) == false) {
      sampleLevel = getSampleOfSoundData(0, 1, soundDataArray);
      if (!!isMoveCamera)
        moveCamera(0.5 + sampleLevel);
    }
    segmentsArray[21].scale.set(1 + sampleLevel * (10), 1 + sampleLevel * (10), 1 + sampleLevel * (10));

    for (let i = 0; i < 7; i++) {
      let sampleLevel = 1;

      //Carefully access the soundDataArray, as it doesn't exist until the user selects a sound file.
      if ((soundDataArray === undefined) == false) {
        sampleLevel = getSampleOfSoundData(0, 7, soundDataArray);
      }
      if (sampleLevel && !isMoveCamera) {
        var endDate = new Date();
        var seconds = (endDate.getTime() - startDate.getTime()) / 1000;
        console.log(seconds);
        if (seconds >= 20)
          isMoveCamera = true;
      }

      segmentsArray[i].scale.set(0.5 + sampleLevel * (4), 0.5 + sampleLevel * (4), 0.5 + sampleLevel * (4));
      segmentsArray[i].theta += sampleLevel * 3;
      segmentsArray[i].position.z = (20 + sampleLevel * 2) * Math.cos((segmentsArray[i].theta + 1) * Math.PI / 180);
      segmentsArray[i].position.y = (20 + sampleLevel * 2) * Math.sin((segmentsArray[i].theta + 1) * Math.PI / 180);
    }

    for (let i = 7; i < 21; i++) {
      let sampleLevel = 1;

      //Carefully access the soundDataArray, as it doesn't exist until the user selects a sound file.
      if ((soundDataArray === undefined) == false) {
        sampleLevel = getSampleOfSoundData(0, 7, soundDataArray);
      }

      segmentsArray[i].scale.set(0.5 + sampleLevel * (4), 0.5 + sampleLevel * (4), 0.5 + sampleLevel * (4));
      segmentsArray[i].theta += 0.5 + sampleLevel * 2;
      segmentsArray[i].position.x = (segmentsArray[i].r + sampleLevel * 2) * Math.cos((segmentsArray[i].theta + 1) * Math.PI / 180);
      segmentsArray[i].position.y = (segmentsArray[i].r + sampleLevel * 2) * Math.sin((segmentsArray[i].theta + 1) * Math.PI / 180);
    }
  }

  var flagX, flagZ;
  function moveCamera() {

    if (camera.position.x >= 0 && camera.position.z >= 90) {
      flagX = 0.5;
      flagZ = -0.5;
      flagY = 0.5;
    } else if (camera.position.x >= 90 && camera.position.z <= 0) {
      flagX = -0.5;
      flagY = -0.5;
    } else if (camera.position.x <= 0 && camera.position.z <= -90) {
      flagZ = 0.5;
    } else if (camera.position.x <= -90 && camera.position.z >= 0) {
      flagX = 0.5;
      flagY = 0.5;
      flagZ = 0.5;
    }
    camera.position.x += flagX;
    camera.position.z += flagZ;
    camera.position.y += flagY;
  }

  var isMoveCamera = false;
  function animate() {
    requestAnimationFrame(animate);


    var time = Date.now() * 0.00025;
    var d = 100;
    var changeScale = [0.3, 0.35, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.4, 0.2, 0.25, 0.36, 0.55]
    for (var i = 0; i < 12; i++) {
      lights[i].position.x = Math.sin(time * changeScale[i]) * d;
      lights[i].position.z = Math.cos(time * changeScale[i + 1]) * d;
    }

    camera.lookAt(scene.position);

    if ((soundDataArray === undefined) == false) {
      analyser.getByteFrequencyData(soundDataArray);
    }
    if (segmentsArray.length > 0) {
      updateMeshes();
    }
    renderer.render(scene, camera);
  }

  animate();

  window.toggleMoveCamera = function () {
    isMoveCamera = !isMoveCamera;
  }


  setCamera = function () {
    camera.position.z = document.getElementById("z").value;
    camera.position.x = document.getElementById("x").value;
    camera.position.y = document.getElementById("y").value;
  }

  createAudioObjects();
};