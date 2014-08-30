var fs = require('fs')
,http = require('http'),
socketio = require('socket.io'),
url = require("url"), 
SerialPort = require("serialport").SerialPort

var socketServer;
var serialPort;
var portName = '/dev/ttyAMA0'; //change this to your Arduino port
var sendData = "";

var debug = 0;

var Volume, Selector, Power;

// handle contains locations to browse to (vote and poll); pathnames.
function startServer(route,handle,debug)
{
	// on request event
	function onRequest(request, response) {
	  // parse the requested url into pathname. pathname will be compared
	  // in route.js to handle (var content), if it matches the a page will 
	  // come up. Otherwise a 404 will be given. 
	  var pathname = url.parse(request.url).pathname; 
	  console.log("Request for " + pathname + " received");
	  var content = route(handle,pathname,response,request,debug);
	}
	
	var httpServer = http.createServer(onRequest).listen(1337, function(){
	//url = 'http://192.168.1.27:1337',
		console.log("Listening at: http://192.168.1.27:1337");
		console.log("Server is up");
	}); 
	serialListener(debug);
	initSocketIO(httpServer,debug);
}

function initSocketIO(httpServer,debug)
{
	socketServer = socketio.listen(httpServer);
	if(debug == false)
	{
		socketServer.set('log level', 1); // socket IO debug off
	}
	
	socketServer.on('connection', function (socket) 
	{
		console.log("User connected");
		socket.emit('onconnection', {pollOneValue:sendData});
		serialPort.write('?');
		socket.emit('updateData',{pollOneValue:Volume});
		socket.emit('updateSelData',{pollOneValue:Selector});
		socket.emit('updatePowData',{pollOneValue:Power});
		
		socketServer.on('update', function(data) 
		{
			socket.emit('updateData',{pollOneValue:data});
			if(debug == 1){console.log('Providing volume button position: '+data);}
		});
	
		socketServer.on('updatesel', function(data) 
		{
			socket.emit('updateSelData',{pollOneValue:data});
			if(debug == 1){console.log('Providing source selector position: '+sendData);}
		});
	
		socketServer.on('updatepow', function(data) 
		{
			if(debug == 1){console.log('Providing power button position: '+data);}
			socket.emit('updatePowData',{pollOneValue:data});
		});
		
		socket.on('buttonval', function(data) //Toggle button
		{
			serialPort.write(data);
			if(debug == 1){console.log('Moving power button: ' + data);}
		});
		socket.on('SelectorSend', function(data) //Toggle button
		{
				if(debug == 1){console.log('Moving source selector: ' + data);}
				serialPort.write(data);
				
		});
		socket.on('sliderval', function(data) //Slider change
		{	
			//data = Math.round((70/0xFF)*data);
			var dataTemp = data;
			data = data.toString(16);
			if(dataTemp < 0x10)//0x10
				data = '0'+ data; //We have to add a trailing 0 in front (F --> 0F)
			data = data.toUpperCase();
		
			if(debug == 1){console.log('Moving volume button: ' + data);}
			serialPort.write('='+data+':');
		});
		socket.on('VolStep', function(data) //Move volume by one step
		{
			serialPort.write(data);
			if(debug == 1){console.log('Moving Volume button by one of: ' + data);}
		});
    });
}

// Listen to serial port
function serialListener(debug)
{
    var receivedData = "";
    serialPort = new SerialPort(portName, 
    {
        baudrate: 38400,
        // defaults for Arduino serial communication
        dataBits: 8,
        parity: 'odd',
        //stopBits: 1,
        flowControl: false
    });
 	
    serialPort.on("open", function () 
    {
		//serialPort.write('?');
		serialPort.write('?');
		serialPort.write('#');
		console.log('open serial communication');
        // Listens to incoming data
        serialPort.on('data', function(data) 
        {
        	receivedData += data.toString();
            //console.log('data:'+data);
             
            var len = receivedData .substring(receivedData .indexOf('v') + 1, receivedData .indexOf('.'));
            len = len.length;
          	if (receivedData .indexOf('v') >= 0 && receivedData .indexOf('.') >= 0 &&  len>1 && len<3 ) 
          	{
           		sendData = receivedData .substring(receivedData .indexOf('v') + 1, receivedData .indexOf('.'));
           		receivedData = '';
           		sendData = parseInt(sendData,16);
           		Volume = sendData;
           		console.log('Received volume button position: '+sendData);
           		socketServer.emit('update', sendData);
           	}
           	
        	if(receivedData .indexOf('s') >= 0 && receivedData .indexOf(',') >= 0) 
        	{
            	sendData = receivedData .substring(receivedData .indexOf('s') + 1, receivedData .indexOf('s') + 2);
           		receivedData = '';
           		socketServer.emit('updatesel', sendData);
           		Selector = sendData;
           		console.log('Received source selector position: '+sendData);
        	}
        	if(receivedData .indexOf('p') >= 0 && receivedData .indexOf('\n') >= 0) 
        	{
            	sendData = receivedData .substring(receivedData .indexOf('p') + 1, receivedData .indexOf('p') + 2);
           		receivedData = '';
           		socketServer.emit('updatepow', sendData);
           		Power = sendData;
           		console.log('Received power button position: '+sendData);
        	}
    
    	}); //serialPort.on('data', function(data) 
    	if(receivedData.length >= 5)
    		{
    			serialPort.flush(function(data){console.log('Serial Error, flushing');});
    		}
    	serialPort.on('error', function(data) 
        {
        	serialPort.flush(function(data){console.log('Serial Error, flushing');});
        });//serialPort.on('data', function(data)
         
	});//serialPort.on("open", function ()   
}

exports.start = startServer;