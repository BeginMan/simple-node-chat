var events = require('events'),
    net = require('net');

var channel = new events.EventEmitter();
channel.clients = {};
channel.subs = {};

// 设置监听器数量100,默认11个
channel.setMaxListeners(100);

channel.on('join', function (id, client) {
    // 加入成员后显示当前在线人数
    var welcome = 'Welcome!\n'
        + '当前在线人数: ' + this.listeners('broadcast').length;
    client.write(welcome + '\n');

    // 注册连接信息
    this.clients[id] = client;
    this.subs[id] = function (senderId, msg, isSystem) {
        if (id != senderId) {
            msg = isSystem ? msg : senderId + " : " + msg;
            this.clients[id].write(msg);
        }
    };
    // 所有连接的用户都监听`broadcast`事件
    // 回调函数就是write数据, 如果发送人是自己则不用给自己write
    this.on('broadcast', this.subs[id]);
    // 新用户注册后广播消息
    this.emit('broadcast', id, '欢迎新用户: ' + id + '!\n', true);
});

channel.on('leave', function (id) {
    // 移除broadcast事件监听器, 即this.subs[id]回调函数
    channel.removeListener('broadcast', this.subs[id]);
    channel.emit('broadcast', id, id + ' 已下线.\n', true);
});

channel.on('shutdown', function () {
   // 关闭服务器
    channel.emit('broadcast', '', '聊天服务被关闭.\n', true);
    channel.removeAllListeners('broadcast');    // 去掉给定类型的所有的监听
});


var server = net.createServer(function (client) {
    var id = client.remoteAddress + ':' + client.remotePort;

    channel.emit('join', id, client);

    client.on('data', function (data) {
        data = data.toString();
        if (data == 'shutdown\n' || data == 'shutdown\r\n'
            || data == 'shutdown\n\n') {
            channel.emit('shutdown')
        } else {
            channel.emit('broadcast', id, data.toString());
        }
    });
    
    client.on('close', function () {
       channel.emit('leave', id);
    });

});

server.listen(4000);
