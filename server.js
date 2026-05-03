const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const vapidKeys = {
    'publicKey': process.env.VAPID_PUBLIC_KEY,
    'privateKey': process.env.VAPID_PRIVATE_KEY
};


webpush.setVapidDetails(
    `mailto:${process.env.MY_MAIL}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, './'))); 

let subscriptions = [];

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        io.emit('taskAdd', task);

        const payload = JSON.stringify({
            title: 'Новая задача',
            body: task.header
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err);
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключен', socket.id);
    });
});

app.post('/subscribe', (req, res) => {

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object' });
    }

    subscriptions.push(req.body);
    console.log('Новая подписка добавлена. Всего:', subscriptions.length);
    res.status(201).json({ message: 'Подписка сохранена' });
});

app.post('/unsubscribe', (req, res) => {
    const {endpoint} = req.body;
    console.log('Запрос на удаление endpoint:', endpoint);
    console.log('Текущие подписки в базе:', subscriptions.map(s => s.endpoint));
    if(!endpoint){
        return res.status(400).json({error: "Endpoint is required"});
    }

    const initialLength = subscriptions.length;

    subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    console.log(`Удалено подписок: ${initialLength - subscriptions.length}`);
    res.status(200).json({ message: 'Подписка успешно удалена с сервера' });
}); 

const PORT = 3001; 

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});