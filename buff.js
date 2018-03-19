var buffer = new ArrayBuffer(4);

var view = new DataView(buffer);
view.setUint32(0, 1492); // (max unsigned 32-bit integer)

console.log(view.getUint32(0));
console.log(buffer);
var x = new Uint8Array(buffer, 0, 4);
console.log(x.reverse());
// expected output: 4294967295
