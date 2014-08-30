var server = require("./server");
var router = require("./route");
var requestHandlers = require("./requestHandlers");

var debug = false;

var handle = {}
handle["/"] = requestHandlers.sendInterface;
handle["/interface"] = requestHandlers.sendInterface;
handle["/js/jquery.knob.js"] = requestHandlers.sendJs;
server.start(router.route,handle,debug);