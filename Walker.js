'use strict';
/*jslint unparam: true, node: true */

var fs = require('fs');
var path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Walker(){
	EventEmitter.call(this);

	var self = this;
	
	// Private to avoid access before walk completion
	var directories = [];
	var files = [];

	// Recursive walk of 'directory'
	var _walk = function(directory, done){
		var pendingFiles;

		fs.readdir(directory, function(err, files){
			if(err){ self.emit('error', err); }

			if(files.length === 0){ done(); }
			else {

				pendingFiles = files.length;
				files.forEach(function(fileName){
					
					var filePath = directory + '/' + fileName;
					filePath = path.normalize(filePath);
					fs.stat(filePath, function(err,stat){

						if(stat && stat.isDirectory()){
							self.emit('directory', filePath);
							_walk(filePath, function(err){
								if(err){ self.emit('error', err); }
								if(--pendingFiles === 0){ done(); }
							});
						} else {
							self.emit('file', filePath);
							if(--pendingFiles === 0){ done(); }
						}
					});
				});
			}
		});
	};

	// Store directory and files in private vars to be returned on 'done'
	this.on('directory', function(dir){ directories.push(dir); });
	this.on('file', function(file){ files.push(file); });

	// Reset directories and files, walk the directory tree with callback to emit 'done' and results
	this._run = function(directory){ 
		directories = [];
		files = [];
		_walk(directory, function(){ self.emit('done', {directories: directories, files: files}); });
	};

}

// Setup Walker prototype inheritance from EventEmitter
util.inherits(Walker, EventEmitter);
Walker.prototype.walk = function(directory){ this._run(directory); };

module.exports = Walker;
