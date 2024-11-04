var fs = require("fs"),
    stream = require("stream");

var Bintail = module.exports = function Bintail(file, options) {
  options = options || {};

  stream.Transform.call(this, options);

  this._file = file;
  this._offset = options.start || 0;
  this._lastIno = null;
  this._handle = null;
  this._delay = 50;

  this._poll();
};
Bintail.prototype = Object.create(stream.Transform.prototype, {constructor: {value: Bintail}});

Bintail.createReadStream = function createReadStream(file, options) {
  return new Bintail(file, options);
};

Bintail.prototype._transform = function _transform(input, encoding, done) {
  if (!Buffer.isBuffer(input)) {
    input = Buffer(input, encoding);
  }

  this._offset += input.length;

  this.push(input);

  return done();
};

Bintail.prototype._schedulePoll = function _schedulePoll() {
  this._delay = Math.min(1000, this._delay * 2);

  setTimeout(this._poll.bind(this), this._delay);
};

Bintail.prototype._poll = function _poll() {
  fs.stat(this._file, function onStat(err, stat) {
    if (err) {
      if (err.code && err.code === "ENOENT") {
        return this._schedulePoll();
      }

      return this.emit("error", err);
    }

    if (!stat) {
      return this.emit("error", Error("no stat value returned"));
    }

    if (!stat.isFile()) {
      return this.emit("error", Error("target is not a file"));
    }

    if (stat.size < this._offset) {
      this._offset = 0;
    }

    if (stat.ino && this._lastIno !== stat.ino) {
      if (this._lastIno !== null) {
        this._offset = 0;          
      }

      this._lastIno = stat.ino;
    }

    if (stat.size > this._offset) {
      return this._open();
    }

    this._schedulePoll();
  }.bind(this));
};

Bintail.prototype._open = function _open() {
  this._delay = 50;

  this._handle = fs.createReadStream(this._file, {start: this._offset});
  this._handle.pipe(this, {end: false});
  this._handle.once("end", function() {
    this._handle = null;
    this._schedulePoll();
  }.bind(this));
};
