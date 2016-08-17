/**
 * Created by fangpeng on 16/8/16.
 */

var socket = io.connect();

$(document).ready(function () {
    var chatApp = new Chat(socket);
    var msgElem = $('#messages');
    var roomList = $('#room-list');

    socket.on('nameResult', function (result) {
        var msg;
        console.log(result);
        if (result.success) {
            if (result.new) {
                msg = '[系统]: 你的用户名为: ' + result.message;
            } else {
                msg = '[系统]: 跟换昵称: ' + result.message;
            }

        } else {
            msg = result.message;
        }

        msgElem.append(sysElem(msg));
    });

    socket.on('joinResult', function (result) {
        $('#room').text(result.room);
        msgElem.append(sysElem('[系统]: 更换聊天室.'));
    });

    socket.on('message', function (result) {
        var newElem = $('<div></div>').text(result.text);
        msgElem.append(newElem);
    });

    socket.on('rooms', function (rooms) {
        roomList.empty();
        for (var room in rooms) {
            if (room.charAt(0) != '/') {
                //room = room.substring(1, room.length);
                if (room != '') {
                    roomList.append(escapedElem(room));
                }
            }

        }
        //点击房间名切换到该房间
        $('#room-list div').click(function () {
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').val('').focus();
        });
    });

    //定期请求可用的房间列表
    setInterval(function () {
        socket.emit('rooms');
    }, 1000);

    $('#send-message').empty().focus();
    $('#send-form').submit(function () {
        userInput(chatApp, socket);
        return false;
    });
});


function escapedElem(msg) {
    return $('<div></div>').text(msg);
}

function sysElem(msg) {
    return $('<div></div>').html('<i>' + msg + '</i>');
}

function userInput(chatApp, socket) {
    var msg = $('#send-message').val();
    var sysMsg;
    var msgElem = $('#messages');
    if (msg.charAt(0) == '/') {     // 聊天命令
        sysMsg = chatApp.processCommand(msg);
        if (sysMsg) {
            msgElem.append(sysElem(sysMsg))
        }
    } else {                        // 聊天信息
        chatApp.sendMsg($('#room').text(), msg);
        msgElem.append(escapedElem(msg));
        msgElem.scrollTop(msgElem.prop('scrollHeight'));
    }
    $('#send-message').val('').focus();
}