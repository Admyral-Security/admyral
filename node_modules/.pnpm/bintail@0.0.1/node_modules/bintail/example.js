#!/usr/bin/env node

var Bintail = require("./");

Bintail.createReadStream("./log.txt").pipe(process.stdout);
