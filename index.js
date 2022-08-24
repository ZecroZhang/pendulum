"use strict"

//displays 
var measuredPeriodDisplay = document.getElementById("measuredPeriodDisplay")
var speedDisplay = document.getElementById("speedDisplay")

var canvas = document.getElementById("canvas")
var ctx = canvas.getContext("2d")

canvas.width = 1024
canvas.height = 1024

//General pendulum variables - they get updated in the userInputHandling file at the bottom so the values on the textbox inputs are correct. 
var gravityForce = -9.8
var length = 10
var lengthToPixelScale = 40 //20px = 1m 

var airResiatanceEnabled = false
var smokeEnalbed = false

//Models an iron ball. 
var fluidDensity = 997//1.225 //kg/m^3 air density at sea level. 
var dragCoefficient = 0.47 //it's a sphere 
var sphereRadius = 0.5 //half a meter
var crossSectionalArea = Math.PI * sphereRadius ** 2
var density = 7800

//pendulum calculation variables 
var angle = Math.PI/2
var speed = 0

//Smoke particles 
class SmokeParticle {
  /**
   * 
   * @param { number } x 
   * @param { number } y 
   * @param { number } size 
   */
  constructor (x, y, size) {
    this.x = x
    this.y = y 
    this.size = size

    this.alpha = 0.5
  }

  update (delta) {
    this.alpha -= 0.5 * delta / 1000 

    if (this.alpha <= 0) return true

    this.size += 0.5 * delta/ 1000 
    this.y -= 20 * delta / 1000

    this.draw()
    return false 
  }

  draw () {
    ctx.fillStyle = "#000"

    ctx.globalAlpha = this.alpha

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * lengthToPixelScale, 0, Math.PI*2)
    ctx.fill()
    
    ctx.globalAlpha = 1
  }
}

/**
 * @type { SmokeParticle[] }
 */
var particles = []

//Pause settings.
var userPaused = false
var paused = false //this includes the auto pause when the window is minimized. 

var delta = 0, lastCheck = performance.now()
Animate()
function Animate () {
  requestAnimationFrame(Animate)
  delta = performance.now() - lastCheck
  lastCheck = performance.now()

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.beginPath()
  ctx.moveTo(canvas.width/2, canvas.height/2)

  ApproximateSwing(delta/1000)
  var { x, y } = ConvertToCoord(angle)
  ctx.lineTo(x, y)

  ctx.lineCap = "round"
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 10
  ctx.stroke()
  
  //Draw the circles and the pendulum itself. 
  ctx.fillStyle = "#a19d94"
  ctx.beginPath()
  ctx.arc(x, y, sphereRadius * lengthToPixelScale, 0, Math.PI*2)
  ctx.fill()

  if (smokeEnalbed && Math.floor(Math.random() * 3) == 0) {
    particles.push(new SmokeParticle(x, y, Math.random() * 0.2 + 0.3))
  }

  for (var c = 0; c < particles.length; c++) {
    if (particles[c].update(delta)) {
      particles.splice(c, 1)
      c --
      continue
    }
  }
}

/**
 * Converts the pendulum angle + length to an x,y coordinate. 
 * @param { number } angle rad 
 */
function ConvertToCoord (angle) {
  var x = (Math.sin(angle) * length * lengthToPixelScale) + canvas.width/2
  var y = (Math.cos(angle) * length * lengthToPixelScale) + canvas.height/2
  return { x, y }
}

//For measuring the period. 
var lowestPointPassed = false
var periodStart = NaN
/**
 * Time in ms. 
 */
var lastPeriod = NaN

/**
 * Updates the pendulum angle and velocity. 
 * @param { number } delta Time passed since last frame in seconds. 
 */
function ApproximateSwing (delta) {
  if (paused) {
    return
  } 

  //Calculate the acceleration 
  var acceleration = 0//gravityForce/length * Math.sin(angle) 

  //If there's air resistance, calculate it and add it to the acceleration. 
  if (airResiatanceEnabled) {
    var forceAir = fluidDensity * Math.pow(speed, 2) * dragCoefficient * crossSectionalArea / 2 

    var mass = CalculateMass()
    if (speed > 0) {
      acceleration -= forceAir / mass
    } else if (speed < 0) {
      acceleration += forceAir / mass
    }
  }

  //Add the approximate acceleration caused by air resistance to speed. 
  speed += acceleration * delta
  
  //Add the acceleration caused by gravity to speed. 
  speed += gravityForce/length * (Math.cos(angle) - Math.cos(angle + delta))

  //Update the "position"
  angle += speed*delta 
  ObservePeriod()
}

/**
 * this does NOT work :(
 * @param { number } delta 
 * @returns 
 */
function Swing (delta) {
  if (paused) {
    return
  }
  var startAngle = angle

  //Going to assume sinx is a function of time where x is the current angle for acceleration. This feels weird.
  //integral (gravity/length) * sinx dx turns into (gravity/length) * (-cosx) + c, where c is probably the current velocity. 
  //integrate again as a definite integral to get the change in distance. Plug in start angle and end angle. (gravity/length) * (sin(startAngle) - sin(startAngle + deltaTime)) + velocity * deltatime 

  //doesn't work :pensive: 
  angle += gravityForce/length * (Math.sin(startAngle) - Math.sin(startAngle + delta) + speed*delta)

  //Increase speed by definite integral of (gravity/length) * sinx dx plugging in end time and start angle. Works for some odd reason. 
  speed += gravityForce/length * (Math.cos(startAngle) - Math.cos(startAngle + delta))

  ObservePeriod()
}

function ObservePeriod () {
  //Update speed display
  speedDisplay.innerText = `${(speed).toFixed(2)}m/s`

  //reset angle if too large for the calculation. 
  //if (angle > Math.PI) angle %= Math.PI
  
  //When passes lowest point. 
  if (angle < 0 && !lowestPointPassed) { //angle 0 is the lowest point
    lowestPointPassed = true
  } else if (angle > 0 && lowestPointPassed) {
    lowestPointPassed = false

    lastPeriod = performance.now() - periodStart
    periodStart = performance.now()

    //Udpate the display
    if (!isNaN(lastPeriod)) {
      measuredPeriodDisplay.innerText = `${(lastPeriod/1000).toFixed(4)}s`
    }
  }
}

/**
 * 
 * @returns { number } Mass of the ball.
 */
function CalculateMass () {
  return 4/3 * Math.PI * Math.pow(sphereRadius, 3) * density
}

/**
 * Returns the time in seconds for a period of the pendulum. This isn't accurate for larger drop angles :(
 * @param { number } gravity Force of gravity. 
 * @param { number } length Length of the pendulum
 */
function PendulumPeriod (gravity, length) {
  // t = 2pi * sqrt(length/gravity)
  return 2 * Math.PI * Math.sqrt(-length/gravity) //gravity is set to negative since it pulls down. 
}

//Auto pause
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState == "visible") {
    if (userPaused) {
      return
    } 
    
    //if it isn't paused by the user. Update the time. 
    lastCheck = performance.now()
    paused = false
  } else {
    paused = true
  }
})