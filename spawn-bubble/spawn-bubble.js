const THREE = require('three')
window.THREE = THREE
require('three/examples/js/shaders/FresnelShader')
require('three.ar.js')
require('three/examples/js/controls/VRControls')

var vrDisplay
var vrFrameData
var vrControls
var arView

var canvas
var camera
var scene
var renderer
var cube

var refractSphere, refractSphereCamera

var colors = [
    new THREE.Color( 0xffffff ),
    new THREE.Color( 0xffff00 ),
    new THREE.Color( 0xff00ff ),
    new THREE.Color( 0xff0000 ),
    new THREE.Color( 0x00ffff ),
    new THREE.Color( 0x00ff00 ),
    new THREE.Color( 0x0000ff ),
    new THREE.Color( 0x000000 )
]

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
THREE.ARUtils.getARDisplay().then(function (display) {
    if (display) {
        vrFrameData = new VRFrameData()
        vrDisplay = display
        init()
    } else {
        THREE.ARUtils.displayUnsupportedMessage()
    }
})

function init() {
    var arDebug = new THREE.ARDebug(vrDisplay)
    document.body.appendChild(arDebug.getElement())

    renderer = new THREE.WebGLRenderer({ alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    console.log('setRenderer size', window.innerWidth, window.innerHeight)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.autoClear = false
    canvas = renderer.domElement
    document.body.appendChild(canvas)
    scene = new THREE.Scene()

    // Creating the ARView, which is the object that handles
    // the rendering of the camera stream behind the three.js scene
    arView = new THREE.ARView(vrDisplay, renderer)

    // The ARPerspectiveCamera is very similar to THREE.PerspectiveCamera,
    // except when using an AR-capable browser, the camera uses
    // the projection matrix provided from the device, so that the
    // perspective camera's depth planes and field of view matches
    // the physical camera on the device.
    camera = new THREE.ARPerspectiveCamera(
        vrDisplay,
        60,
        window.innerWidth / window.innerHeight,
        vrDisplay.depthNear,
        vrDisplay.depthFar
    )

    refractSphereCamera = new THREE.CubeCamera( 0.1, 5000, 512 )
	// refractSphereCamera.renderTarget.mapping = new THREE.CubeRefractionMapping()
    scene.add( refractSphereCamera )
	
    var shader = THREE.FresnelShader
    var uniforms = THREE.UniformsUtils.clone( shader.uniforms )
    uniforms.tCube.value = refractSphereCamera.renderTarget.texture

    var material = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
    } )

    var sphereGeom =  new THREE.SphereGeometry( .05, 64, 32 )
    
    refractSphere = new THREE.Mesh( sphereGeom, material )
    refractSphere.position.set(0, 1, 0)
    refractSphereCamera.position = refractSphere.position
    scene.add(refractSphere)

    // VRControls is a utility from three.js that applies the device's
    // orientation/position to the perspective camera, keeping our
    // real world and virtual world in sync.
    vrControls = new THREE.VRControls(camera)

    // Create the cube geometry that we'll copy and place in the
    // scene when the user clicks the screen
    var geometry = new THREE.BoxGeometry( 0.05, 0.05, 0.05 )
    // var faceIndices = ['a', 'b', 'c']
    // for (var i = 0; i < geometry.faces.length; i++) {
    //     var f  = geometry.faces[i]
    //     for (var j = 0; j < 3; j++) {
    //         var vertexIndex = f[faceIndices[ j ]]
    //         f.vertexColors[j] = colors[vertexIndex]
    //     }
    // }
    // var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors })
    cube = new THREE.Mesh(geometry, material)

    // Bind our event handlers
    window.addEventListener('resize', onWindowResize, false)
    canvas.addEventListener('touchstart', onClick, false)

    // Kick off the render loop!
    update()
}

/**
 * The render loop, called once per frame. Handles updating
 * our scene and rendering.
 */
function update() {
    // Render the device's camera stream on screen first of all.
    // It allows to get the right pose synchronized with the right frame.
    arView.render()

    // Update our camera projection matrix in the event that
    // the near or far planes have updated
    camera.updateProjectionMatrix()

    // From the WebVR API, populate `vrFrameData` with
    // updated information for the frame
    vrDisplay.getFrameData(vrFrameData)

    vrControls.update()

    renderer.clearDepth()
    renderer.render(scene, camera)

    requestAnimationFrame(update)
}

function onWindowResize () {
    console.log('setRenderer size', window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function onClick () {
    var pose = vrFrameData.pose

    // Convert the pose orientation and position into
    // THREE.Quaternion and THREE.Vector3 respectively
    var ori = new THREE.Quaternion(
        pose.orientation[0],
        pose.orientation[1],
        pose.orientation[2],
        pose.orientation[3]
    )

    var pos = new THREE.Vector3(
        pose.position[0],
        pose.position[1],
        pose.position[2]
    )

    var dirMtx = new THREE.Matrix4()
    dirMtx.makeRotationFromQuaternion(ori)

    var push = new THREE.Vector3(0, 0, -1.0)
    push.transformDirection(dirMtx)
    pos.addScaledVector(push, 0.125)

    var clone = cube.clone()
    scene.add(clone)
    clone.position.copy(pos)
    clone.quaternion.copy(ori)
}

