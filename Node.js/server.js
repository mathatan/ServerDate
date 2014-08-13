'use strict';

var
    fs = require("fs"),
    express = require('express'),
    app = express(),
    server;

var files = [
    '/config.js',
    '/lib/ServerDate.js'
];

for (var i = 0, count = files.length; i < count; ++i) {
    (function(file) {
        app.get(file, function (req, res) {
            res.sendfile(file, {root: '../'});
        });
    })(files[i]);
}

app.get("/api/get_time", function (req, res) {
    res.set("Content-Type", "text/plain");
    res.send(String(Date.now()));
});

app.get("/", function (req, res) {
    res.sendfile("example.html", {root: '../'});
});

server = app.listen(8888);
console.log("Open http://localhost:" + server.address().port + " in a browser.");
