var ipc 			= require('ipc'),
	fs 				= require('fs'),
	path 			= require('path'),
	Gaze 			= require('gaze'),
	Haml			= require('haml'),
	_ 				= require('lodash'),
	currentFile		= 0,
	gaze,
	start,
	end;

$('#menu').on('click', function () {
	if( $('#menuOptions').css('display') === 'none' ) {
		$('#menuOptions').css('display', 'inline-block');
	} else {
		$('#menuOptions').css('display', 'none');
	}
});

function watchDirectory (bool) {
	if (bool) {
		console.log("Watched Dir: " + options.watch.directory);
		gaze = null;
		gaze = new Gaze('*.haml', {cwd: options.watch.directory}, function (err, watcher) {
			this.on('changed', function (filepath) {
				console.log(filepath + ' was changed');
				var dest = getDestination(filepath);
				start = +new Date();
				readHamlFile(filepath, dest, compileHaml);
			});

			this.on('added', function (filepath) {
				console.log(filepath + ' was added');
				var dest = getDestination(filepath);
				start = +new Date();
				readHamlFile(filepath, dest, compileHaml);
			});
		});
	} else {
		try {
			gaze.close();
			gaze = null;
		} catch (err) {
			console.log('No watch open');
		}
	}
};

var holder = document.getElementById('holder');

holder.ondragover = function () { return false; };
holder.ondragleave = holder.ondragend = function () { return false; };

holder.ondrop = function (e) {
	e.preventDefault();
	start = +new Date();
	var files = e.dataTransfer.files;
	var file = e.dataTransfer.files[0];
	var dest = getDestination(file.path);
	if ( files.length === 1 ) {
		var extension = path.extname(files['0'].path);
		if ( extension === '.haml' ) {
			readHamlFile(file.path, dest, compileHaml);
		} else {
			changeInfoText("File was not a Haml file.");
		};
	} else if ( files.length > 1 ) {
		var hamlFiles = [];
		_.forEach(files, function(n, key) {
			if ( path.extname(files[key].path) === '.haml' ) {
				hamlFiles.push(files[key].path);
			}
		});
		readManyHamlFiles(hamlFiles, dest, compileHaml);
	};
	return false;
};

function changeInfoText (text) {
	$('#info').text(text);
};

function getDestination (src) {
	var dest;
	if ( options.compile.sameFolder ) {
		dest = path.dirname(src) + '/';
	}
	else if ( options.compile.htmlFolder ) {
		dest = path.dirname(path.dirname(src)) + '/html/';
	}
	else if ( options.compile.chooseFolder.enabled ) {
		dest = options.compile.chooseFolder.directory + '/';
	}
	return dest;
};

function compileEnd (fileName) {
	console.log("Saved " + fileName + '.html successfully!');
	end = +new Date();
	var compileTime = end - start;
	changeInfoText("Compiled " + fileName + '.html in ' + compileTime + 'ms');
};

function compileFileEnd (fileName) {
	currentFile += 1;
};

function compileHaml (hamlStr, fileName, dest , many) {
	var html = Haml.render(hamlStr);
	
	fs.writeFile(dest + fileName + '.html', html, function (err) {
		if (err) {
			changeInfoText('Directory does not exist');
			throw err;
		}

		compileEnd(fileName);
	});
};

function readHamlFile (src, dest, callback) {
	var fileName = path.basename(src, '.haml');
	fs.readFile(src, 'utf8', function (err, data) {
		if (err) throw err;
		callback(data, fileName, dest);
	});
};

function readManyHamlFiles (array, dest, callback) {
	array.forEach(function (filePath) {
		var fileName = path.basename(filePath, '.haml');
		fs.readFile(filePath, 'utf8', function (err, data) {
			if (err) throw err;
			callback(data, fileName, dest, true);
		});
	});
};

function fileDialogClicked (obj) {
	var clickedId = obj.attr('id');
	ipc.send('open-dialog', clickedId);
};

function compileOptionClicked (obj) {
	var clickedId = obj.attr('id');
	var selectArray = [];
	$('#compileOptions div').removeClass('selected');
	obj.addClass('selected');
	selectArray.push('compile', clickedId);
	selectOption(selectArray);
};

function htmlOptionClicked (obj) {
	var clickedId = obj.attr('id');
	var selectArray = [];
	if (obj.hasClass('selected')) {
		obj.removeClass('selected');
	} else {
		obj.addClass('selected');
	}

	selectArray.push('html', clickedId);
	selectOption(selectArray);
};

function watchOptionClicked (obj) {
	var clickedId = obj.attr('id');
	var selectArray = [];
	var option = $('#watchOptions div');

	if ( option.hasClass('selected') ){
		option.removeClass('selected');
	} else {
		option.addClass('selected');
	}

	selectArray.push('watch', clickedId);
	selectOption(selectArray);
};

function selectOption (array) {
	console.log(array[0]);
	if ( array[0] === 'compile' ) {
		options.compile.sameFolder = 			false;
		options.compile.htmlFolder = 				false;
		options.compile.chooseFolder.enabled = 	false;
		if( array[1] === 'chooseFolder') {
			options.compile.chooseFolder.enabled = true;
		} else {
			options.compile[array[1]] = true;
		}
	} else if ( array[0] === 'watch') {
		if ( $('#' + array[1]).hasClass('selected') ) {
			options.watch.enabled = true;
		} else {
			options.watch.enabled = false;
		}
	} else if ( array[0] === 'html' ) {
		if ( $('#' + array[1]).hasClass('selected') ) {
			if ( array[1] === 'minifyHtml' ) {
				options.html.minify = true;
			} 
		} else {
			if ( array[1] === 'minifyHtml' ) {
				options.html.minify = false;
			} 
		}
	}
	if (options.watch.enabled === false) {
		try {
			gaze.close();
		} catch (err) {
			console.log(err);
		}
	} else {
		watchDirectory(options.watch.enabled);
	}
	writeOptionsToFile();
};

$('#chooseFolder, #watchFolder').on('click', function (e) {
	if ( !$(this).hasClass('selected') ) {
		fileDialogClicked($(this));
	}
});

$('#sameFolder, #htmlFolder, #chooseFolder').on('click', function (e) {
	compileOptionClicked($(this));
});

$('#watchFolder').on('click', function (e) {
	watchOptionClicked($(this));
});

$('#minifyHtml').on('click', function (e) {
	htmlOptionClicked($(this));
});

ipc.on('open-dialog-reply', function (arg) {
	console.log(arg[1]);
	if ( arg[1] === 'watchFolder' ) {
		options.watch.directory = arg[0].toString();
		if (options.watch.enabled) {
			watchDirectory(true);
		}
	} else if ( arg[1] === 'chooseFolder' ) {
		options.compile.chooseFolder.directory = arg[0].toString();
	}
	$('#' + arg[1]).children('.directoryBox').text(arg[0]);
	writeOptionsToFile();
});


// SAVING AND READING OPTIONS

// Options placeholder if the file doesn't exist
var options = {
	compile: {
		sameFolder: 	true,
		htmlFolder: 		false,
		chooseFolder: {
			enabled: 	false,
			directory: 	null
		} 
	},
	watch: {
		enabled: 		false,
		directory: 		null 
	},
	html: {
		minify: 		false
	}
};

readOptionsFromFile();


function writeOptionsToFile (callback) {
	fs.writeFile(__dirname + '/options.json', JSON.stringify(options, null, 4), function (err) {
		if (err) throw err;
		console.log("Wrote options to file.");
		if (callback) callback();
	});
};

function readOptionsFromFile () {
	fs.readFile(__dirname + '/options.json', 'utf8', function (err, data) {
		if (err) {
			writeOptionsToFile(selectOptionsFromFile);
		};
		options = JSON.parse(data);
		selectOptionsFromFile();
		watchDirectory(options.watch.enabled);
	});
};

function selectOptionsFromFile () {
	var filesToSelect = [];

	if ( options.compile.sameFolder ) {
		filesToSelect.push('#sameFolder');
	} else if ( options.compile.htmlFolder ) {
		filesToSelect.push('#htmlFolder');
	} else if ( options.compile.chooseFolder.enabled ) {
		filesToSelect.push('#chooseFolder');
		$('#chooseFolder .directoryBox').text(options.compile.chooseFolder.directory);
	} 

	if ( options.watch.enabled ) {
		filesToSelect.push('#watchFolder');
		$('#watchFolder .directoryBox').text(options.watch.directory);
	};

	if ( options.html.minify ) {
		filesToSelect.push('#minifyHtml');
	}

	selectOptions(filesToSelect);
};

function selectOptions (array) {
	$.each(array, function (index, value) {
		var item = value;
		$(item).addClass('selected');
	});
};
