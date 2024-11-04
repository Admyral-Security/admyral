Bintail
=======

Like tail -f, but binary-safe!

Overview
--------

This is a very simple, probably naiive, binary-safe `tail -f` implementation for
Node.JS. The thing that makes this module different from most of the others on
NPM is that it doesn't rely on the actual `tail` command (what the hell, right?,)
doesn't rely on any external dependencies, and is written in a way that makes it
possible to read for people who aren't robots.

Why didn't this exist already?

Super Quickstart
----------------

Doesn't get much easier.

```javascript
var Bintail = require("bintail");

Bintail.createReadStream("./log.txt").pipe(process.stdout);
```

Installation
------------

Available via [npm](http://npmjs.org/):

> $ npm install bintail

Or via git:

> $ git clone git://github.com/deoxxa/bintail.git node_modules/bintail

API
---

**constructor**

Constructs a new Bintail object, providing a filename and optionally some other
parameters. It's usually easier to just use `createReadStream`.

```javascript
new Bintail(filename, [options]);
```

```javascript
// basic instantiation
var bt = new Bintail("./log.txt");

// instantiation with a start offset
var bt = new Bintail("./log.txt", {start: 100});
```

Arguments

* _filename_ - a string
* _options_ - an object specifying options

**createReadStream**

Creates a new Bintail object and returns it. I can't believe it's not
`fs.createReadStream()`!

```javascript
Bintail.createReadStream(filename, [options]);
```

```javascript
require("bintail").createReadStream("./log.txt").pipe(process.stdout);
```

Arguments

* _filename_ - a string
* _options_ - an object specifying options

License
-------

3-clause BSD. A copy is included with the source.

Contact
-------

* GitHub ([deoxxa](http://github.com/deoxxa))
* Twitter ([@deoxxa](http://twitter.com/deoxxa))
* ADN ([@deoxxa](https://alpha.app.net/deoxxa))
* Email ([deoxxa@fknsrs.biz](mailto:deoxxa@fknsrs.biz))
