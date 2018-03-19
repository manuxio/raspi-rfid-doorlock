var wpi = require('wiring-pi');
wpi.setup();
var pin = 1; //Change pin number according to your wiring
wpi.pinMode(pin, wpi.OUTPUT);
var value = 1;
setInterval(function() {
  wpi.digitalWrite(pin, value);
  value = +!value;
}, 500);
