
var canvas;
var gl;
var program;
var near = 1;
var far = 100;
var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;
var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;
var ambientColor, diffuseColor, specularColor;
var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var RX = 0;
var RY = 0;
var RZ = 0;
var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;
var useTextures = 0;
let monsterPositions = [];
let trackTime = 0;
let counter = 0;




//making a texture image procedurally
//Let's start with a 1-D array
var texSize = 64;
var imageCheckerBoardData = new Array();
// Now for each entry of the array make another array
// 2D array now!
for (var i = 0; i < texSize; i++)
  imageCheckerBoardData[i] = new Array();
// Now for each entry in the 2D array make a 4 element array (RGBA! for colour)
for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++)
    imageCheckerBoardData[i][j] = new Float32Array(4);
// Now for each entry in the 2D array let's set the colour.
// We could have just as easily done this in the previous loop actually
for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++) {
    var c = (i + j) % 2;
    imageCheckerBoardData[i][j] = [c, c, c, 1];
  }

//Convert the image to uint8 rather than float.
var imageCheckerboard = new Uint8Array(4 * texSize * texSize);
for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++)
    for (var k = 0; k < 4; k++)
      imageCheckerboard[4 * texSize * i + 4 * j + k] = 255 * imageCheckerBoardData[i][j][k];
// For this example we are going to store a few different textures here
var textureArray = [];


// Setting the colour which is needed during illumination of a surface
function setColor(c) {
  ambientProduct = mult(lightAmbient, c);
  diffuseProduct = mult(lightDiffuse, c);
  specularProduct = mult(lightSpecular, materialSpecular);

  gl.uniform4fv(gl.getUniformLocation(program,
    "ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "specularProduct"), flatten(specularProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "lightPosition"), flatten(lightPosition));
  gl.uniform1f(gl.getUniformLocation(program,
    "shininess"), materialShininess);
}

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
  if (im.complete) {
    console.log("loaded");
    return true;
  }
  else {
    console.log("still not loaded!!!!");
    return false;
  }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename) {
  //create and initalize a webgl texture object.
  tex.textureWebGL = gl.createTexture();
  tex.image = new Image();
  tex.image.src = filename;
  tex.isTextureReady = false;
  tex.image.onload = function () { handleTextureLoaded(tex); }
}



// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
  //Binds a texture to a target. Target is then used in future calls.
  //Targets:
  // TEXTURE_2D           - A two-dimensional texture.
  // TEXTURE_CUBE_MAP     - A cube-mapped texture.
  // TEXTURE_3D           - A three-dimensional texture.
  // TEXTURE_2D_ARRAY     - A two-dimensional array texture.
  gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
  //texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
  //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
  //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
  //Border: Width of image border. Adds padding.
  //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
  //Type: Data type of the texel data
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
  //Set texture parameters.
  //texParameteri(GLenum target, GLenum pname, GLint param);
  //pname: Texture parameter to set.
  // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
  // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
  //param: What to set it to.
  //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
  //For the Min Filter: 
  //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
  //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  //Generates a set of mipmaps for the texture object.
  /*
      Mipmaps are used to create distance with objects. 
  A higher-resolution mipmap is used for objects that are closer, 
  and a lower-resolution mipmap is used for objects that are farther away. 
  It starts with the resolution of the texture image and halves the resolution 
  until a 1x1 dimension texture image is created.
  */
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
  gl.bindTexture(gl.TEXTURE_2D, null);
  console.log(textureObj.image.src);
  textureObj.isTextureReady = true;
}


// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually laoded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
  setTimeout(
    function () {
      var n = 0;
      for (var i = 0; i < texs.length; i++) {
        console.log(texs[i].image.src);
        n = n + texs[i].isTextureReady;
      }
      wtime = (new Date()).getTime();
      if (n != texs.length) {
        console.log(wtime + " not ready yet");
        waitForTextures(texs);
      }
      else {
        console.log("ready to render");
        render(0);
      }
    },
    5);
}



// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
  //create and initalize a webgl texture object.
  tex.textureWebGL = gl.createTexture();
  tex.image = new Image();

  //Binds a texture to a target. Target is then used in future calls.
  //Targets:
  // TEXTURE_2D           - A two-dimensional texture.
  // TEXTURE_CUBE_MAP     - A cube-mapped texture.
  // TEXTURE_3D           - A three-dimensional texture.
  // TEXTURE_2D_ARRAY     - A two-dimensional array texture.
  gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

  //texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
  //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
  //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
  //Border: Width of image border. Adds padding.
  //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
  //Type: Data type of the texel data
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

  //Generates a set of mipmaps for the texture object.
  /*
      Mipmaps are used to create distance with objects. 
  A higher-resolution mipmap is used for objects that are closer, 
  and a lower-resolution mipmap is used for objects that are farther away. 
  It starts with the resolution of the texture image and halves the resolution 
  until a 1x1 dimension texture image is created.
  */
  gl.generateMipmap(gl.TEXTURE_2D);

  //Set texture parameters.
  //texParameteri(GLenum target, GLenum pname, GLint param);
  //pname: Texture parameter to set.
  // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
  // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
  //param: What to set it to.
  //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
  //For the Min Filter: 
  //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
  //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
  gl.bindTexture(gl.TEXTURE_2D, null);

  tex.isTextureReady = true;
}


// This just calls the appropriate texture loads and puts the textures in an array
function initTextures() {
  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/tank.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/tankwheel.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/ufo.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/garage.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/pyramid.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/sky.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/ground.jpg");

  textureArray.push({});
  loadFileTexture(textureArray[textureArray.length - 1], "./picture/monster.jpg");
}


// Changes which texture is active in the array of texture examples (see initTextures)
function toggleTextures() {
  useTextures = (useTextures + 1) % 2
  gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}







window.onload = function init() {

  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.5, 0.5, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  setColor(materialDiffuse);

  // Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
  // Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
  Cube.init(program);
  Cylinder.init(20, program);
  Cone.init(20, program);
  Sphere.init(36, program);

  // Matrix uniforms
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  // Lighting Uniforms
  gl.uniform4fv(gl.getUniformLocation(program,
    "ambientProduct"), flatten(ambientProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "diffuseProduct"), flatten(diffuseProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "specularProduct"), flatten(specularProduct));
  gl.uniform4fv(gl.getUniformLocation(program,
    "lightPosition"), flatten(lightPosition));
  gl.uniform1f(gl.getUniformLocation(program,
    "shininess"), materialShininess);



  document.getElementById("animToggleButton").onclick = function () {
    if (animFlag) {
      animFlag = false;
    }
    else {
      animFlag = true;
      resetTimerFlag = true;
      window.requestAnimFrame(render);
    }
  };

  document.getElementById("textureToggleButton").onclick = function () {
    toggleTextures();
    window.requestAnimFrame(render);
  };

  var controller = new CameraController(canvas);
  controller.onchange = function (xRot, yRot) {
    RX = xRot;
    RY = yRot;
    window.requestAnimFrame(render);
  };

  // Helper function just for this example to load the set of textures
  initTextures();
  waitForTextures(textureArray);

  //generate random location 
  for (let i = 0; i < 25; i++) {
    const x1 = Math.random() * 60;
    const z1 = -3 - Math.random() * 60;
    monsterPositions.push([x1, 0, z1]);
    const x2 = 25 + Math.random() * 10;
    const z2 = 10 + Math.random() * 5;
    monsterPositions.push([x2, 0, z2]);
  }
};

// Sets the modelview and normal matrix in the shaders
function setMV() {
  modelViewMatrix = mult(viewMatrix, modelMatrix);
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  normalMatrix = inverseTranspose(modelViewMatrix);
  gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}
// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  setMV();
}
// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
  setMV();
  Cube.draw();
}
// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
  setMV();
  Sphere.draw();
}
// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
  setMV();
  Cylinder.draw();
}
// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
  setMV();
  Cone.draw();
}
// Draw a Bezier patch
function drawB3(b) {
  setMV();
  b.draw();
}
// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x, y, z) {
  modelMatrix = mult(modelMatrix, translate([x, y, z]));
}
// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta, x, y, z) {
  modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}
// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx, sy, sz) {
  modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}
// Pops MS and stores the result as the current modelMatrix
function gPop() {
  modelMatrix = MS.pop();
}
// pushes the current modelViewMatrix in the stack MS
function gPush() {
  MS.push(modelMatrix);
}

//create land 
function creatGround() {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[6].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
  gPush();
  {
    setColor(vec4(1, 1, 0, 1));
    gTranslate(0, -4, 0);
    gScale(180, 1, 180);
    drawCube();
  }
  gPop();
}

//create sky
function creatSky() {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[5].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
  gPush();
  {
    setColor(vec4(1, 0, 0, 1));
    gTranslate(30, 0, -80);
    gScale(70, 20, 0.1);
    drawCube();
  }
  gPop();
}

//create tank
function createTankWheels() {
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 1);
  //make wheel keep rotate until tank into the pyramid
  if (TIME < 19) {
    wheelRotation = -360;
  }

  gPush();
  {
    gTranslate(-2, -0.4, -2);
    gRotate(-90, 0, 1, 0);
    gPush();
    {
      // Draw  left wheel
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(0.3, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      // square in the middle
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle left wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(1, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle middle wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(1.7, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(2.4, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(3.1, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front right right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(3.8, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.38, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();
    // the wheel of tank on the another side
    gTranslate(0, 0, -1);
    gPush();
    {
      // Draw left wheel
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(0.3, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle left wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(1, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle middle wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(1.7, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front middle right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(2.4, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(3.1, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();

    // Draw front right right wheel
    gPush();
    {
      setColor(vec4(0.5, 0.5, 0.5, 1.0));
      gTranslate(3.8, 0, 0);
      gRotate(wheelRotation * TIME, 0, 0, 1);
      gPush();
      {
        gRotate(wheelRotation * TIME, 0, 0, 1);
        gScale(0.35, 0.35, 0.05);
        drawSphere();
      }
      gPop();
      gPush();
      {
        setColor(vec4(1, 1, 1, 1));
        gScale(0.15, 0.15, 0.15);
        drawCube();
      }
      gPop();
    }
    gPop();


  }
  gPop();
}

//crate tank body + wheels
function createTank() {
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 1);
  gPush();
  {
    // tank down body
    setColor(vec4(1, 0, 0, 1));
    gRotate(90, 0, 1, 0);
    gPush();
    {
      gScale(0.5, 0.3, 2.1);
      drawCube();
    }
    gPop();
    // tank middle body
    gPush();
    {
      gTranslate(0, 0.4, 0);
      gScale(0.4, 0.1, 1.5);
      drawCube();
    }
    gPop();
    // tank up body
    gPush();
    {
      gTranslate(0, 0.6, -0.3);
      gScale(0.3, 0.4, 1);
      drawCube();
    }
    gPop();
    // tank weapon body
    gPush();
    {
      gTranslate(0, 0.7, 1.5);
      gScale(0.05, 0.05, 1);
      drawCube();
    }
    gPop();
    gTranslate(1.5, 0, 0);
    createTankWheels();
  }
  gPop();
}

//let tank move, set move speed and the end point
function moveTank() {
  gPush();
  {
    if (TIME < 19) {
      gTranslate(TIME * 1, 0, 0);
    }
    else gTranslate(26, 0, 0);
    createTank();
  }
  gPop();
}



//create monster, I used some of my own a1 code 
function createMonster() {

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[7].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 2);

  gPush();
  {
    gTranslate(0, 0, 0);
    setColor(vec4(0.4, 0.2, 0.7, 1));
    //rset the range depends on the time changing
    gRotate(-90, 0, 1, 0);
    let x = Math.sin(TIME / 7);
    let y = Math.sin(TIME / 5);
    //the range that monster can swim
    gTranslate(1 + x, 1 + y, 0)
    gPush();
    {
      gTranslate(2, 0.3, 0)
      gRotate(90, 0, 90, 0);
      gScale(0.2, 0.2, 0.22);
      drawCube();
    }
    gPop();
    gPush();
    {
      gTranslate(2, 0.7, 0)
      gScale(1, 0.4, 0.4);
      gRotate(180, 0, 180, 180);
      drawCone();
    }
    gPop();
    //create legs and set position and direction
    pos = [2, 0, 0];
    createMonsterLegs(pos, 1);
    pos = [0, 0, 0];
    createMonsterLegs(pos, -1);
    gRotate(180, 0, 180, 0);
    pos = [0, 0, 0];
    createMonsterLegs(pos, 1);
    pos = [0, 0, 0];
    createMonsterLegs(pos, -1);
  }
  gPop();
}

//create two legs, set position and direction 
function createMonsterLegs(pos, dir) {
  const rotation = dir * 10 * Math.cos(TIME * 2)
  gTranslate(pos[0], pos[1], pos[2]);
  //roate all legs in correct position
  gRotate(9, 1, -25, 0);
  gPush();
  {
    //long leg
    gRotate(50 - rotation, 1, 0, 0);
    gTranslate(0, -0.2, 0);
    gPush();
    {
      gScale(0.02, 0.3, 0.05);
      drawCube();
    }
    gPop();
    //short leg
    gTranslate(0, -0.50, -0.14);
    gRotate(35 - rotation, 1, 0, 0);
    gPush();
    {
      gScale(0.02, 0.3, 0.05);
      drawCube();
    }
    gPop();
    //claw
    gTranslate(0, -0.45, 0.1);
    gRotate(25 - rotation, 1, 0, 0);
    gPush();
    {
      gScale(0.02, 0.1, 0.2);
      drawCube();
    }
    gPop();
  }
  gPop();
}

//creat garage for tank at tank start point
function creatGarage() {
  gPush();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[3].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 1);
  {
    gTranslate(-2, 1, 0.8);
    gPush();
    {
      gScale(4, 2, 4);
      drawCube();
    }
    gPop();
  }
  gPop();
  //make a exit for tank
  toggleTextures()
  createGargeDoor();
  toggleTextures()
}
//make a exit(door) for tank
function createGargeDoor() {
  gPush();
  {
    gPush();
    {
      gScale(2.01, 2, 2);
      setColor(vec4(0, 0, 0, 0));
      drawCube();
    }
    gPop();
  }
  gPop();
}



//crate an UFO 
function createUFO() {
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[2].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 3);
  //short body
  gPush();
  {
    setColor(vec4(1, 1, 1, 1));
    gTranslate(0, 0, 0);
    let xEnd = -2 + TIME + (TIME % (Math.PI * 8));
    let yEnd = 3 * Math.sin(TIME / 5);
    gTranslate(xEnd, yEnd, -60);
    gScale(0.7, 0.6, 0.6);
    drawSphere();
  }
  gPop();
  //long body
  gPush();
  {
    setColor(vec4(1, 1, 1, 1));
    gTranslate(0, 0, 0);
    let xEnd = -2 + TIME + (TIME % (Math.PI * 8));
    let yEnd = 3 * Math.sin(TIME / 5);
    gTranslate(xEnd, yEnd, -60);
    gScale(1.6, 0.3, 1);
    drawSphere();
  }
  gPop();
}

//crate pyrmid and also a door for pyrmid that can let tank drive in
function createPyramid() {
  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, textureArray[4].textureWebGL);
  gl.uniform1i(gl.getUniformLocation(program, "texture1"), 5);
  gTranslate(23, 0, -2.5);
  //pyramid bottom
  gPush();
  {
    gPush();
    gTranslate(0, 0, 2);
    {
      gScale(7, 2, 4);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up 
  gPush();
  {
    gPush();
    gTranslate(0, 2.5, 2);
    {
      gScale(6, 0.5, 3.5);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up up
  gPush();
  {
    gPush();
    gTranslate(0, 3, 2);
    {
      gScale(5, 0.5, 0.5);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up up up
  gPush();
  {
    gPush();
    gTranslate(0, 3.5, 2);
    {
      gScale(5, 0.5, 3);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up up up
  gPush();
  {
    gPush();
    gTranslate(0, 4.5, 2);
    {
      gScale(4.5, 0.5, 2.5);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up up up up
  gPush();
  {
    gPush();
    gTranslate(0, 5.5, 2);
    {
      gScale(4, 0.5, 2);
      drawCube();
    }
    gPop();
  }
  gPop();


  //pyramid bottom up up up up up
  gPush();
  {
    gPush();
    gTranslate(0, 6.5, 2);
    {
      gScale(3.5, 0.5, 1.5);
      drawCube();
    }
    gPop();
  }
  gPop();

  //pyramid bottom up up up up up up 
  gPush();
  {
    gPush();
    gTranslate(0, 7.5, 2);
    {
      gScale(3, 0.5, 1);
      drawCube();
    }
    gPop();
  }
  gPop();
  //create a door for tank
  toggleTextures();
  createPyramidDoor();
  toggleTextures();
}
  //create a door for tank
function createPyramidDoor() {
  gPush();
  {
    gPush();
    gTranslate(0, 0, 2);
    {
      setColor(vec4(0, 0, 0, 0));
      gScale(7.01, 1.1, 2.3);
      drawCube();
    }
    gPop();
  }
  gPop();
}


function render() { 
  // set eyes follow the tank and change angle when tank almost drive in to the pyramid
  if (TIME < 14) {
    eye = vec3(TIME, 3, 16);
  } 
  else if (TIME < 17) {
    eye = vec3(13, 3, 8);
  } 
  else {
    // 360 degree the see around the whole area
    eye = vec3(21 + 10 * Math.cos((1 / 2) * Math.PI + (1 / 2) * (TIME - 23)),  5, 10 * Math.sin((1 / 2) * Math.PI + (1 / 2) * (TIME - 23)));
  }
  // set the projection matrix
  projectionMatrix = ortho(left, right, bottom, ytop, near, far);
  //change an angle to roate
  if (TIME < 19) {
    at = vec3(TIME, 2, 0);
  } 
  else if (TIME < 21) {
    at = vec3(20, TIME-90 , TIME);
  } 
  else {
    at = vec3(15, 3.5, -2);
  }

  // Initialize modeling matrix stack
  MS = []; 
  // initialize the modeling matrix stack
  modelMatrix = mat4();
  // set the camera matrix
  viewMatrix = lookAt(eye, at, up);

  // send all the matrices to the shaders
  setAllMatrices();

  //get the frame rate,
  var currentTime;
  if (animFlag) {
    currentTime = new Date().getTime() / 1000;
    if (resetTimerFlag) {
      prevTime = currentTime;
      resetTimerFlag = false;
    }
    TIME += currentTime - prevTime;
    prevTime = currentTime;
    counter++;
    if (TIME - trackTime > 2) {
      trackTime = TIME;
      console.log("frame rate every 2 seconds: ", counter);
      counter = 0;
    }
  }

  creatSky();
  creatGround();
  gTranslate(0, -2, -10);
  moveTank();
  creatGarage();
  createUFO();
  
  // Create Monsters randomly
  for (let i = 0; i < 30; i++) {
    gPush();
    gTranslate(monsterPositions[i][0], monsterPositions[i][1], monsterPositions[i][2]);
    createMonster();
    gPop();
  }

  createPyramid();

  if (animFlag)
    window.requestAnimFrame(render);
}



// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
  var controller = this;
  this.onchange = null;
  this.xRot = 0;
  this.yRot = 0;
  this.scaleFactor = 3.0;
  this.dragging = false;
  this.curX = 0;
  this.curY = 0;

  // Assign a mouse down handler to the HTML element.
  element.onmousedown = function (ev) {
    controller.dragging = true;
    controller.curX = ev.clientX;
    controller.curY = ev.clientY;
  };

  // Assign a mouse up handler to the HTML element.
  element.onmouseup = function (ev) {
    controller.dragging = false;
  };

  // Assign a mouse move handler to the HTML element.
  element.onmousemove = function (ev) {
    if (controller.dragging) {
      // Determine how far we have moved since the last mouse move
      // event.
      var curX = ev.clientX;
      var curY = ev.clientY;
      var deltaX = (controller.curX - curX) / controller.scaleFactor;
      var deltaY = (controller.curY - curY) / controller.scaleFactor;
      controller.curX = curX;
      controller.curY = curY;
      // Update the X and Y rotation angles based on the mouse motion.
      controller.yRot = (controller.yRot + deltaX) % 360;
      controller.xRot = controller.xRot + deltaY;
      // Clamp the X rotation to prevent the camera from going upside
      // down.
      if (controller.xRot < -90) {
        controller.xRot = -90;
      } else if (controller.xRot > 90) {
        controller.xRot = 90;
      }
      // Send the onchange event to any listener.
      if (controller.onchange != null) {
        controller.onchange(controller.xRot, controller.yRot);
      }
    }
  };
}
