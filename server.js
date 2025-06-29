// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, 'public')));

const activeUsers = {};
const dpCount = 3; // Number of available DP image placeholders

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('set username', (username) => {
        const dpIndex = Math.floor(Math.random() * dpCount);
        activeUsers[socket.id] = { username, dpIndex };
        console.log(`User ${username} (${socket.id}) joined with DP index ${dpIndex}`);

        socket.emit('current user info', { id: socket.id, username: username });

        io.emit('user list update', Object.values(activeUsers).map(user => ({
            id: Object.keys(activeUsers).find(key => activeUsers[key] === user),
            username: user.username,
            dpIndex: user.dpIndex
        })));
    });

    socket.on('public message', (data) => {
        const sender = activeUsers[socket.id];
        if (sender) {
            console.log(`Public message from ${sender.username}: ${data.message}`);
            io.emit('public message', {
                senderId: socket.id,
                senderName: sender.username,
                senderDpIndex: sender.dpIndex,
                message: data.message,
                timestamp: new Date().toLocaleTimeString() // Use server time
            });
        }
    });

    socket.on('private message', (data) => {
        const sender = activeUsers[socket.id];
        const recipientSocketId = data.recipientId;
        const recipient = activeUsers[recipientSocketId];

        if (sender && recipient) {
            console.log(`Private message from ${sender.username} to ${recipient.username}: ${data.message}`);
            const messageData = {
                senderId: socket.id,
                senderName: sender.username,
                senderDpIndex: sender.dpIndex,
                recipientId: recipientSocketId,
                recipientName: recipient.username,
                message: data.message,
                timestamp: new Date().toLocaleTimeString(),
                isPrivate: true
            };

            socket.emit('private message', messageData);
            io.to(recipientSocketId).emit('private message', messageData);
        } else {
            socket.emit('system message', 'Error: User not found or disconnected.');
        }
    });

    socket.on('disconnect', () => {
        const disconnectedUser = activeUsers[socket.id];
        if (disconnectedUser) {
            console.log(`User disconnected: ${disconnectedUser.username} (${socket.id})`);
            delete activeUsers[socket.id];

            io.emit('user list update', Object.values(activeUsers).map(user => ({
                id: Object.keys(activeUsers).find(key => activeUsers[key] === user),
                username: user.username,
                dpIndex: user.dpIndex
            })));
        } else {
            console.log(`User disconnected: ${socket.id} (username not set)`);
        }
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});