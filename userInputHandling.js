///<reference path="./types.ts"/>
///<reference path="./index.js"/>

"use strict"

//Tabs, Id of the tab panel. Has TabButton at the end for the actual button. 
const tabs = [ "mainControls", "airResistanceControls" ]
for (let tab of tabs) {
  //Listener for tab button press. 
  document.getElementById(`${tab}TabButton`).addEventListener("click", () => {
    //Selects the current tab. 
    for (var t of tabs) {
      if (t == tab) {
        document.getElementById(`${t}`).style.display = "block"
        document.getElementById(`${t}TabButton`).classList.add("selectedTab")
      } else {
        document.getElementById(`${t}`).style.display = "none"
        document.getElementById(`${t}TabButton`).classList.remove("selectedTab")
      }
    }
  })
}


/**
 * Creates a new div containing the name, text input and slider to be appended to the main div. 
 * @param { string } divId Id to give the new divs. It will automatically be named `${divId}TextInput` and `${divId}InputSlider`
 * @param { string } labelHTML HTML of the label. 
 * @param { string } appendingDiv Id of the div this element is being added to. 
 * @param { number } sliderMin 
 * @param { number } sliderMax 
 * @param { number } defaultValue 
 * @param { ProcessingFunction } ProcessingFunction Arguments to be passed in: (new value, textbox element, slider element) No need to worry about NaN values. 
 * @param { boolean } autoUpdate To autoupdate both slider and textbox on input received. Defaults to true. It is changed BEFORE ProcessingFunction is called. 
 * 
 * @returns { UpdateAllFunction } 
 */
function CreateSliderTextBox(divId, labelHTML, appendingDiv, sliderMin, sliderMax, defaultValue, ProcessingFunction, autoUpdate = true) {
  //Create the container div along with the text.
  var container = document.createElement("div")
  container.innerHTML = `<div class="rowLabel">${labelHTML}</div>`

  //Sub containder row item for holding the slider + text box 
  var subContainer = document.createElement("div")
  subContainer.classList.add("rowItem")

  //Since the slider is 1 to 1000, we can calculate the value based on sliderMin and sliderMax. (sliderValue - sliderMin) * ratio 
  var ratio = (sliderMax - sliderMin) / 1000

  //Create the slider. 
  var slider = document.createElement("input")
  slider.type = "range"
  slider.id = `${divId}InputSlider`
  slider.classList.add("miniSlider")
  slider.min = 1
  slider.max = 1000 //this is gonna be a design flaw later. 
  slider.value = Math.round(ToSliderValue(defaultValue))

  //Create the textbox 
  var textbox = document.createElement("textarea")
  textbox.id = `${divId}TextInput`
  textbox.value = Number(defaultValue)
  
  //Add the slider and textbox to the subcontainer, and subcontainder into main container.
  subContainer.appendChild(textbox)
  subContainer.appendChild(slider)
  container.appendChild(subContainer)

  //Call the autoupdate for the first time 
  ProcessingFunction(defaultValue, textbox, slider)


  //Add listeners for changing. 
  textbox.addEventListener("change", () => {
    var newValue = Number(textbox.value)
    if (isNaN(newValue)) return

    if (autoUpdate) {
      slider.value = ToSliderValue(newValue)
    }

    ProcessingFunction(newValue, textbox, slider)
  })
  slider.addEventListener("input", () => {
    var adjustedValue = AdjustSliderValue()

    if (autoUpdate) {
      textbox.value = adjustedValue.toFixed(4)
    }

    ProcessingFunction(adjustedValue, textbox, slider)
  })

  //Append the containder to the main div.
  document.getElementById(appendingDiv).appendChild(container)


  //Adjusting the slider 
  /**
   * @returns { number } The adjusted value based on the sliderMin and sliderMax. 
   */
  function AdjustSliderValue () {
    return slider.value * ratio + sliderMin
  }

  /**
   * 
   * @param { number } value Value relative to the sliderMin and max. 
   */
  function ToSliderValue (value) {
    return (value - sliderMin) / ratio
  }


  /**
   * Function for updating everything. 
   * @param { number } value
   */
  return (value) => {
    textbox.value = value.toFixed(4)
    slider.value = ToSliderValue(value)

    ProcessingFunction(value, textbox, slider)
  }
}

//Scale display 
var scaleDisplay = document.getElementById("scaleDisplay")

//Inputs
var UpdateLength = CreateSliderTextBox("length", "Arm length(m): ", "upperAdjustPanel", 0.01, 20, 10, (lengthInput, textbox, slider) => { length = lengthInput }, true)
var UpdateGravity = CreateSliderTextBox("gravity", "Gravity(m/s<sup>2</sup>): ", "upperAdjustPanel", -0.01, -50, -9.8, (gravityInput, textbox, slider) => { gravityForce = gravityInput }, true)

var UpdatePixelRatio = CreateSliderTextBox("pixelRatio", "Pixels per meter: ", "lowerAdjustPanel", 0.01, 200, 40, (pxRatio, textbox, slider) => {
  lengthToPixelScale = pxRatio

  //About 75% of the svg element is the actual scale. I wish I had a better system for this lol. 
  //The scale svg takes up x relative to window size. 
  var scaleToWindowRatio = scaleDisplay.getBoundingClientRect().width / window.innerWidth //scale size in vw 

  //The canvas should be 50% width since 50vw and the canvas is always 1024 pixels wide. 
  var scaleLength = 1024/pxRatio * scaleToWindowRatio * 2  

  //Update the scale display. 
  scaleDisplay.children[1].children[0].innerHTML = `${scaleLength.toFixed(2)}m`
}, true)

//Smoke animation. 
document.getElementById("smokeCheckBox").addEventListener("click", event => {
  smokeEnalbed = event.target.checked  
})

//pause and reset velocity button
document.getElementById("playPauseButton").addEventListener("click", event => {
  if (userPaused) {
    //Update the time and unpause.
    lastCheck = performance.now()
    userPaused = false
    paused = false
  } else {
    userPaused = true
    paused = true
  }
  event.target.innerHTML = userPaused ? "Play" : "Pause"
})

document.getElementById("resetVelocityButton").addEventListener("click", () => {
  speed = 0
})


//Air resistance controls
document.getElementById("airResistanceCheckBox").addEventListener("click", event => {
  airResiatanceEnabled = event.target.checked
})
document.getElementById("airResistanceCheckBox").checked = false

var UpdateRadius = CreateSliderTextBox("radius", "Ball radius(m): ", "airResistanceAdjustPanel", 0.01, 5, 0.5, (radiusInput, textbox, slider) => {
  sphereRadius = radiusInput
  UpdateMassDisplay()
}, true)

var UpdateDensity = CreateSliderTextBox("density", "Ball density(kg/m<sup>3</sup>): ", "airResistanceAdjustPanel", 0.01, 10000, 7800, (input, textbox, slider) => {
  density = input
  UpdateMassDisplay()
}, true)

var UpdateFluidDensity = CreateSliderTextBox("fluidDensity", "Fluid density(kg/m<sup>3</sup>): ", "airResistanceAdjustPanel", 0.01, 1000, 1.225, (input) => { fluidDensity = input }, true)

var UpdateDragCoefficient = CreateSliderTextBox("dragCoefficient", "Drag coefficient: ", "airResistanceAdjustPanel", 0.01, 3, 0.47, (input) => { dragCoefficient = input }, true)

function UpdateMassDisplay () {
  document.getElementById("ballMassDisplay").innerText = `${CalculateMass().toFixed(2)}`
}