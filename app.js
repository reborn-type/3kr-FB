const form = document.getElementById('note-form');
const noteInput = document.getElementById('note-input');
const noteHeader = document.getElementById('note-header');
const container = document.getElementById('notes-container');

function loadNotes() {
    const notes = JSON.parse(localStorage.getItem('notes')) || "[]";
    container.innerHTML = notes.map(note => `
        <div class="note">
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
        `).join('');
}

deleteNote = (header) => {
    const notes = JSON.parse(localStorage.getItem('notes')) || "[]";
    const filteredNotes = notes.filter(note => note.header !== header);
    localStorage.setItem('notes', JSON.stringify(filteredNotes));
    loadNotes();
}

function addNote(header, content) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push({ header, content });
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes();
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const header = noteHeader.value.trim();
    const content = noteInput.value.trim();
    if (header && content) {
        addNote(header, content);
        noteHeader.value = '';
        noteInput.value = '';
    }
});


loadNotes();

if('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await 
                navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker зарегистрирован:', registration.scope);
        }
        catch (e) {
            console.error('Ошибка регистрации Service Worker:', e);
        }
    })
}

