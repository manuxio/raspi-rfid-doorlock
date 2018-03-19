var TextEncoder = require('text-encoding').TextEncoder;
var TextDecoder = require('text-encoding').TextDecoder;
var encoding = 'utf-8';
console.log(TextEncoder);
var string = 'ò';
var uint8array = new TextEncoder().encode(string);
console.log(uint8array);
var string = new TextDecoder(encoding).decode(uint8array);
console.log(string);
