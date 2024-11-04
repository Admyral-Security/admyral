var _ = require("underscore"),
    Bintail = require("bintail"),
    fs = require("fs"),
    glob = require("glob"),
    JLick = require("jlick"),
    path = require("path"),
    stream = require("stream");

var Tremor = module.exports = function Tremor(options) {
  options = options || {};

  options.objectMode = true;

  stream.Readable.call(this, options);

  this._glob = options.glob || "*";
  this._files = [];

  this._poll();
};
Tremor.prototype = Object.create(stream.Readable.prototype, {constructor: {value: Tremor}});

Tremor.prototype._read = function _read(n) {};

Tremor.prototype._poll = function _poll() {
  glob(this._glob, function(err, files) {
    _.difference(files || [], this._files).forEach(this._follow.bind(this));

    setTimeout(this._poll.bind(this), 60 * 1000);
  }.bind(this));
};

Tremor.prototype._follow = function _follow(file, offset) {
  this._files.push(file);

  var name = path.basename(file).replace(/^(?:log\.)?(.+?)(?:\.(?:err|out))?$/, "$1");

  fs.stat(file, function(err, stat) {
    if (!stat.isFile()) {
      return;
    }

    this.emit("following", {file: file, name: name});

    var offset = 0;

    if (stat && stat.size) {
      offset = stat.size;
    }

    Bintail.createReadStream(file, {start: offset}).pipe(new JLick()).on("data", function onEntry(entry) {
      this.push({
        from: name,
        time: entry[0],
        level: entry[1],
        message: entry[2],
        info: entry[3],
      });
    }.bind(this));
  }.bind(this));
};
