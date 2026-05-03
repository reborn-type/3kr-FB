const contentDiv = document.getElementById('content-div');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const socket = io('http://localhost:3001');


socket.on('reminderSnoozed', (data) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const index = notes.findIndex(n => n.id === data.id);
    if (index !== -1) {
        notes[index].reminder = data.newTime;
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }
});


function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush () {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; 

    try {
        const registration = await navigator.serviceWorker.ready;
        const publicKey = 'BO-ksqdQZR-1f0MXnubZ5Q5lElCYxaX8i_rt_JgQfnBuuoHA8VNQZ5z4Z5QFXTIgo5hThfauHdUOVuM_gGZXI-k'.trim();
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        await fetch('http://localhost:3001/subscribe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(subscription)
        });
        console.log('Подписка на push отправлена');
        return subscription;
    } catch(e){
        console.error("Тип ошибки:", e.name);
        console.error("Сообщение:", e.message);
        return null;
    }
}

async function unsubscribeFromPush () {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; 

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if(subscription){
        try{
            await fetch('http://localhost:3001/unsubscribe', {
                method: "POST",
                headers: {'Content-Type': "application/json"},
                body: JSON.stringify({endpoint: subscription.endpoint})
            });
            console.log('Сервер удалил подписку');
        } catch (e) {
            console.error('Не удалось связаться с сервером для отписки', e);
        }
        await subscription.unsubscribe();
        console.log('Отписка выполнена');
    }
}



function setActiveBtn(activeId){
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

async function updatePushButtonState() {
    try{
        const enableBtn = document.getElementById('enable-push');
        const disableBtn = document.getElementById('disable-push');
        const registration = await navigator.serviceWorker.ready;
        if (!enableBtn || !disableBtn) return;
        if (!('serviceWorker' in navigator)) return;

        const subscription = await registration.pushManager.getSubscription();

        console.log("Текущая подписка:", subscription);

        if (subscription) {
            enableBtn.style.display = 'none';
            disableBtn.style.display = 'inline-block';
        }

        enableBtn.onclick = async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await subscribeToPush();
                await updatePushButtonState();
                enableBtn.style.display = 'none';
                disableBtn.style.display = 'inline-block';
            } else {
                alert('Доступ к уведомлениям запрещен');
            }
        };

        disableBtn.onclick = async () => {
            await unsubscribeFromPush();
            await updatePushButtonState();
            disableBtn.style.display = 'none';
            enableBtn.style.display = 'inline-block';
    }} catch (err) {
        console.error("Ошибка при обновлении состояния кнопок:", err);
    }
}


async function loadContent(page){
    try {
        const response = await fetch(`/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;

        if(page == 'home'){
            initNotes();
            updatePushButtonState();
        }

    } catch(e){
        contentDiv.innerHTML = `<p class="is-center text-error">Ошибка загрузки страницы.</p>`;
        console.error(e);
    }
}


function initNotes(){
    const form = document.getElementById('note-form');
    const headerInput = document.getElementById('note-header');
    const textInput = document.getElementById('note-input');
    const reminderForm = document.getElementById('reminder-form');
    const reminderHeader = document.getElementById('reminder-header');
    const reminderTime = document.getElementById('reminder-time');
    const reminderContent = document.getElementById('reminder-content');
    const notesList = document.getElementById('notes-list');

    function loadNotes() {
        
        if (!notesList) return;

        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notesList.innerHTML = notes.map(note => {
            let reminderInfo = '';
            if (note.reminder) {
                const date = new Date(note.reminder);
                reminderInfo = `<p class="note__reminder-text">Напоминание: ${date.toLocaleString()}<p>`;
            }
            
            return `
            <div class="note">
                <div class="note-wrapper">
                    <div class="note__text-block">
                        <h2 class="note__header">${note.header}</h2>
                        <p class="note__content">${note.content}</p>
                    </div>
                    <button class="delete-btn" onclick="deleteNote('${note.header}')">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path opacity="0.3" d="M8 24L24 8M8 8L24 24" stroke="#F3F0E7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="note__reminder">
                    ${reminderInfo}
                </div>
            </div>
            `}).join('');
    }

    function addNote(header, content, reminderTimestamp = null) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = { id: Date.now(), header, content, reminder: reminderTimestamp}
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();

        if (reminderTimestamp){
            socket.emit('newReminder', {
                id: newNote.id,
                header: header,
                reminderTime: reminderTimestamp
            });
        }
        else {
            socket.emit('newTask', { header, timestamp: Date.now() });
        }
    }

    window.deleteNote = (header) => {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const filteredNotes = notes.filter(note => note.header !== header);
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        loadNotes();
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const header = headerInput.value.trim();
            const content = textInput.value.trim();
            if (header && content) {
                addNote(header, content);
                headerInput.value = '';
                textInput.value = '';
            }
        });
    }

    if(reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const header = reminderHeader.value.trim();
            const datetime = reminderTime.value;
            const content = reminderContent.value.trim();
            if (header && content && datetime) {
                const timestamp = new Date(datetime).getTime();
                if (timestamp > Date.now()){
                    addNote(header, content, timestamp);
                    reminderHeader.value = '';
                    reminderTime.value = '';
                } else {
                    alert('Дата напоминания должна быть в будущем');
                }
            }
        });
    }

    loadNotes();
}

socket.on('taskAdd', (task) => {
    console.log('Задача от другого клиента:', task);
    const notification = document.createElement('div');
    notification.textContent = `Новая задача: ${task.header}`;
    notification.style.cssText = `
        position: fixed; top: 10px; right: 10px;
        background: #4285f4; color: white; padding: 1rem;
        border-radius: 5px; z-index: 1000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
});

homeBtn.addEventListener('click', () => {
    setActiveBtn('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveBtn('about-btn');
    loadContent('about');
});

loadContent('home');


if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован:', registration.scope);
            
            updatePushButtonState();
        } catch (e) {
            console.error('Ошибка регистрации Service Worker:', e);
        }
    });
}