#!/usr/bin/env node

var JLick = require("./index");

var jlick = new JLick();

jlick.on("error", function(e) {
  console.log(e);
});

jlick.on("readable", function() {
  var o;

  while (o = jlick.read()) {
    console.log(o);
  }
});

jlick.write(JSON.stringify({a: "b", c: "d"}) + "\n");
jlick.write(JSON.stringify({a: "b", c: "d"}) + "\n");
jlick.write("not real data\n");
jlick.write(JSON.stringify({a: "b", c: "d"}) + "\n");
