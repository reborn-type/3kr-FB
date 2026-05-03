const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const reminders = new Map();

const vapidKeys = {
    'publicKey': 'BO-ksqdQZR-1f0MXnubZ5Q5lElCYxaX8i_rt_JgQfnBuuoHA8VNQZ5z4Z5QFXTIgo5hThfauHdUOVuM_gGZXI-k',
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

const pushOptions = {
    TTL: 60,
    headers: { 'Urgency': 'high' }
}

io.on('connection', (socket) => {
    console.log('Клиент подключён:', socket.id);

    socket.on('newTask', (task) => {
        io.emit('taskAdd', task);

        const payload = JSON.stringify({
            title: 'Новая задача',
            body: task.header
        });

        subscriptions.forEach((sub, index) => {
            webpush.sendNotification(sub, payload).catch(err => {
                console.error('Push error:', err.statusCode);
                if (err.statusCode === 410 || err.statusCode === 403) {
                    subscriptions.splice(index, 1);
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log('Клиент отключен', socket.id);
    });

    socket.on('newReminder', (reminder) => {
        const {id, header, reminderTime} = reminder; 
        const delay = reminderTime - Date.now();
        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({
                title: 'Напоминание',
                body: header, 
                reminderId: id
            });

            subscriptions.forEach(sub => {
                webpush.sendNotification(sub, payload).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 403) {
                        console.log(`Удаляю невалидную подписку: ${sub.endpoint}`);
                        subscriptions.splice(index, 1); 
                    } else {
                        console.error('Push error:', err);
                    }
                });
            });
        }, delay);

        reminders.set(id, {timeoutId, text: header, reminderTime});
    });
});

app.post('/subscribe', (req, res) => {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
        subscriptions.push(subscription);
    }
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

app.post('/snooze', (req, res) => {
    const reminderId = parseInt(req.query.reminderId, 10);
    if(!reminderId || !reminders.has(reminderId)) {
        return res.status(404).json({error: "reminder not found"});
    }

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);

    const newDelay = 5 * 60 * 1000;
    const newTime = Date.now() + newDelay;

    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({
            title: 'Напоминание отложено',
            body: reminder.text,
            reminderId: reminderId 
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub, payload).catch(err => 
                console.error('Push error:', err));
        })
        reminders.delete(reminderId);
    }, newDelay);

    reminders.set(reminderId, {
        timeoutId: newTimeoutId,
        text: reminder.text,
        reminderTime: newTime
    });
    
    io.emit('reminderSnoozed', { id: reminderId, newTime: newTime });

    res.status(200).json({message: "Reminder snoozed for 5 minutes"})
})

const PORT = 3001; 

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});