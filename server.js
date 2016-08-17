/**
 * Created by fangpeng on 16/8/16.
 */

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    chatServer = require('./lib/chat_server'),
    cache = {};


function send404(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('404 Not Found.')
}

function sendFile(res, filePath, fileContents) {
    res.writeHead(
        200,
        {"Content-Type": mime.lookup(path.basename(filePath))}
    );
    res.end(fileContents);
}

function serverStatic(res, cache, absPath) {
    if (cache[absPath]) {
        sendFile(res, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) send404(res);
                    else {
                        cache[absPath] = data;
                        sendFile(res, absPath, data);
                    }
                })
            } else {
                send404(res);
            }
        })
    }
}

var server = http.createServer(function (req, res) {
    var filePath = false;
    if (req.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + req.url;
    }
    var absPath = './' + filePath;
    serverStatic(res, cache, absPath);
});

// 启动socket.IO服务器,给它提供一个已经定义好的HTTP服务器,共享同一端口.
chatServer.listen(server);

server.listen(3000, function () {
    console.log("Chat Server Listening On Port 3000");
});

