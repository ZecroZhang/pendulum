"use strict"
//I've gotten into the habit of drawing icons in js, instead of using an image. Why... 
;(() => {
  var icon = document.createElement("canvas")
  icon.width = 512
  icon.height = 512
  
  var arm = {
    length: 400,
    angle: Math.PI/4
  }

  var pendulumLocation = [ 32 + arm.length * Math.sin(arm.angle), 32 + arm.length * Math.cos(arm.angle) ]

  var ctx = icon.getContext("2d")

  ctx.lineCap = "round"
  ctx.lineWidth = 20
  ctx.fillStyle = "#a19d94"
  ctx.strokeStyle = "#000000"

  ctx.beginPath()
  ctx.moveTo(32, 32)
  ctx.lineTo(...pendulumLocation)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(...pendulumLocation, 60, 0, Math.PI*2)
  ctx.fill()

  //Add icon 
  var iconElement = document.createElement("link")
  iconElement.rel = "icon"
  iconElement.href = icon.toDataURL("image/png")
  document.head.appendChild(iconElement)
})()