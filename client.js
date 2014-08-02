'use strict';
/*jslint unparam: true, node: true */

var socket = io();
socket.on('file list', function(data){ console.log(data); });
socket.on('log line', function(data){ console.log(data); });