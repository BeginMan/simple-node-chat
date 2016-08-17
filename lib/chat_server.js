/**
 * Created by fangpeng on 16/8/16.
 * Socket.IO
 * 命名规范:
 *      sid: socket.id
 */


var socketio = require('socket.io'),
    guestNumber = 1,            // 自增ID号
    nickNames = {},             // 成员昵称映射对象 {sid: name}
    namesUsed = [],             // 成员昵称数组 [name, ....]
    currentRoom = {},           // 房间映射{sid: roomName}
    io;

exports.listen = function (server) {
    io = socketio.listen(server);   // 监听
    io.set('log level', 1);         // 设置日志级别
    io.sockets.on('connection', function (socket) {
        // 定义连接处理逻辑
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed, true);
        joinRoom(socket, '默认大区');      // 用户连接后送入Lobby聊天室内
        handleMessageBroadcasting(socket, nickNames);    // 广播
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);

        socket.on('rooms', function () {
            // 用户发起请求时,提供已经被占用的聊天室列表
            socket.emit('rooms', io.of('/').adapter.rooms);
        });

        // 用户断开连接后的清理逻辑
        handleClientDisconnection(socket, nickNames, namesUsed);
    })
};

/*
    分配昵称
 */
function assignGuestName(socket, guestNumber, nickNames, namesUsed, isNew) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;     // 记录用户当前昵称
    socket.emit('nameResult', {success: true, message: name, new: isNew});
    namesUsed.push(name);
    return guestNumber + 1;
}

/*
    进入聊天室
 */

function joinRoom(socket, room) {
    socket.join(room);                  // 加入房间,调用socket的join方法
    currentRoom[socket.id] = room;      // 记录用户当前房间

    //触发joinResult事件
    socket.emit('joinResult', {room: room});

    //广播消息
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + '已加入聊天室: ' + room + '.'
    });

    //汇总这个房间成员信息
    var userInRoom = io.of('/').in(room).clients;

    //console.log(io.nsps['/'].adapter.rooms[room]);

    //ref: http://stackoverflow.com/questions/23858604/how-to-get-rooms-clients-list-in-socket-io-1-0

    //if (userInRoom.length > 1) {
    //    var sum = '已经在 ' + room + ': ';
    //    for (var i in userInRoom) {
    //        var sid = userInRoom[i].id;
    //        if (sid != socket.id) {
    //            if (i > 0) sum += ', ';
    //            sum += nickNames[sid];
    //        }
    //    }
    //    sum += '.';
    //    socket.emit('message', {text: sum});
    //}
}


/*
    更名
 */

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) {          // 添加nameAttempt事件监听器
        if (name.indexOf('Guest') == 0) {       // 昵称不能以Guest开头
            socket.emit('nameResult', {
                success: false,
                message: '昵称不能以"Guest"开头.'
            });
        } else {
            if (namesUsed.indexOf(name) == -1) {    // 如果昵称还没有注册上则注册
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];

                socket.emit('nameResult', {success: true, message: name});
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' 更改昵称:' + name + '.'
                });
            } else {        // 昵称被占用发送错误信息
                socket.emit('nameResult', {
                    success: false,
                    message: '昵称被占用'
                });
            }
        }
    })
}


/*
    转发信息
 */

function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ':' + message.text
        })
    })
}

/*
    加入房间
 */

function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    })
}


/*
    用户断开连接
 */

function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}
