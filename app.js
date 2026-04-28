const contentDiv = document.getElementById('content-div');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');

function setActiveBtn(activeId){
    [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}


async function loadContent(page){
    try {
        const response = await fetch(`/content/${page}.html`);
        const html = await response.text();
        contentDiv.innerHTML = html;

        if(page == 'home'){
            initNotes();
        }
    } catch(e){
        contentDiv.innerHTML = `<p class="is-center text-error">Ошибка загрузки страницы.</p>`;
        console.error(e);
    }
}

homeBtn.addEventListener('click', () => {
    setActiveBtn('home-btn');
    loadContent('home');
});

aboutBtn.addEventListener('click', () => {
    setActiveBtn('about-btn');
    loadContent('about');
});

loadContent('home');

function initNotes(){
    const form = document.getElementById('note-form');
    const headerInput = document.getElementById('note-header');
    const textInput = document.getElementById('note-input');
    const notesList = document.getElementById('notes-list');

    function loadNotes() {
        
        if (!notesList) return;

        const notes = JSON.parse(localStorage.getItem('notes')) || '[]';
        notesList.innerHTML = notes.map(note => `
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

    function addNote(header, content) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push({ header, content });
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNotes();
    }

    window.deleteNote = (header) => {
        const notes = JSON.parse(localStorage.getItem('notes')) || '[]';
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

    loadNotes();
}

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

