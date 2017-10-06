const THREE = require('three')
window.THREE = THREE
require('three.ar.js')
require('three/examples/js/controls/VRControls')

var vrDisplay
var vrControls
var arView
var canvas
var camera
var scene
var renderer
var reticle

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
THREE.ARUtils.getARDisplay().then(function (display) {
	if (display) {
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
	camera = new THREE.ARPerspectiveCamera(vrDisplay, 60, window.innerWidth / window.innerHeight, 0.01, 100)

	// Create our ARReticle, which will continuously fire `hitTest` to trace
	// the detected surfaces
	reticle = new THREE.ARReticle(vrDisplay,
									0.03, // innerRadius
									0.04, // outerRadius
									0xff0077, // color
									0.25) // easing
	scene.add(reticle)

	// VRControls is a utility from three.js that applies the device's
	// orientation/position to the perspective camera, keeping our
	// real world and virtual world in sync.
	vrControls = new THREE.VRControls(camera)

	window.addEventListener('resize', onWindowResize, false)

	update()
}

function update() {
	// Render the device's camera stream on screen first of all.
	// It allows to get the right pose synchronized with the right frame.
	arView.render()

	camera.updateProjectionMatrix()

	// Update our ARReticle's position, and provide normalized
	// screen coordinates to send the hit test -- in this case, (0.5, 0.5)
	// is the middle of our screen
	reticle.update(0.5, 0.5)

	// Update our perspective camera's positioning
	vrControls.update()

	renderer.clearDepth()
	renderer.render(scene, camera)

	requestAnimationFrame(update)
}

function onWindowResize () {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)
}