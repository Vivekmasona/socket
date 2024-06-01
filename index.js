const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(bodyParser.json());
app.use(cors());

let sessions = {};

function initializeSession(sessionId) {
    if (!sessions[sessionId]) {
        sessions[sessionId] = { url: '', status: 'stop', volume: 100, action: null, value: null, createdAt: new Date() };
    }
}

// REST API Endpoints
app.post('/control', (req, res) => {
    const { action, value, sessionId } = req.body;

    if (!sessionId || !action) {
        return res.status(400).json({ error: 'Missing sessionId or action' });
    }

    initializeSession(sessionId);

    sessions[sessionId].action = action;
    sessions[sessionId].value = value;

    io.to(sessionId).emit('control', { action, value });

    res.json({ status: 'Command received', action, value, sessionId });
});

app.post('/update-url', (req, res) => {
    const { url, sessionId } = req.body;

    if (!sessionId || !url) {
        return res.status(400).json({ error: 'Missing sessionId or url' });
    }

    initializeSession(sessionId);

    sessions[sessionId].url = url;

    io.to(sessionId).emit('update-url', { url });

    res.json({ status: 'URL updated', sessionId });
});

app.get('/current-url/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    if (!sessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    res.json({
        success: true,
        sessionId,
        url: sessions[sessionId].url,
        status: sessions[sessionId].status,
        volume: sessions[sessionId].volume,
        action: sessions[sessionId].action,
        value: sessions[sessionId].value
    });
});

// Socket.IO setup
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
