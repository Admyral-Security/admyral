var stream = require("stream"),
    util = require("util");

var JLick = module.exports = function JLick(terminator) {
  stream.Transform.call(this, {objectMode: true});

  if (typeof terminator === "undefined") {
    this.terminator = "\n";
  } else {
    this.terminator = terminator;
  }

  this.buffer = Buffer(0);
};
util.inherits(JLick, stream.Transform);

JLick.prototype._transform = function _transform(input, encoding, done) {
  this.buffer += input;

  if (this.buffer.indexOf(this.terminator) !== -1) {
    var lines = this.buffer.split(this.terminator);
    this.buffer = lines.pop();

    lines.forEach(function(line) {
      try {
        line = JSON.parse(line);
      } catch (e) {
        return;
      }

      this.push(line);
    }.bind(this));
  }

  return done();
};
