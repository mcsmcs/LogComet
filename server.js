'use strict';
/*jslint unparam: true, node: true */

var express = require('express');
var app = express();
var sio = require('socket.io');
var sockets = [];
var DirectoryWalker = require('./Walker');
var spawn = require('child_process').spawn;
var duplexer = require('duplexer');
var combine = require('stream-combiner');

var fileList;
function updateFileList(){
	var walker = new DirectoryWalker();
	walker.on('done', function(results){ fileList = results.files; });
	walker.walk('./test');
}
updateFileList();

var io = sio.listen(app.listen(3000, function(){ 
	console.log('Listening on 3000');
}));

function spawnToDuplexStream(command,args){
	var cliArguments;

	if (args && args instanceof Array){ cliArguments = args; }
	else if (args && typeof args === 'string'){ cliArguments = args.split(' '); }

	var cmd = spawn(command, cliArguments);
	var stream = duplexer(cmd.stdin,cmd.stdout);
	return {child_process: cmd, stream: stream};
}



app.set('views', __dirname);
app.set('view engine', 'jade');
app.use(express.static(__dirname));

app.get('/', function(req,res){
	res.render('index');
});


io.on('connection', function(socket){
	console.log('New connection!');
	console.log(fileList);
	if(sockets.indexOf(socket) === -1){ sockets.push(socket); }

	socket.on('get file list', function(){
		socket.emit('file list', fileList);
	});

	socket.on('run', function(data){
		socket.child_processes = [];

		// Start with a tail -f
		var args = '-f ' + fileList.join(' ');
		socket.child_processes.push(spawnToDuplexStream('tail', args));
		socket.command_stream = socket.child_processes[socket.child_processes.length-1].stream;

		// Pipe our filters together
		data.commands.forEach(function(command){
			socket.child_processes.push(spawnToDuplexStream(command.command, command.args));
			socket.command_stream = combine(socket.command_stream,socket.child_processes[socket.child_processes.length-1].stream);
		});

		// Send data to user
		socket.command_stream.on('data', function(data){
			socket.emit('log line', data.toString());
		});
	});

	socket.on('disconnect', function(){
		console.log('Connection Closed');
		sockets.splice(sockets.indexOf(socket),1);
		if(socket.child_processes){ socket.child_processes.forEach(function(child_process){ child_process.child_process.kill(); }); }
	});
});

