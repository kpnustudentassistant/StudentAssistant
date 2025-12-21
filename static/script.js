const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const scrollBtn = document.getElementById("scroll-down-btn");
const footer = document.querySelector('footer');

// --- ВИПРАВЛЕННЯ 1: Отримуємо збережену сесію або NULL ---
let currentSessionId = localStorage.getItem("chatSessionId");

function addMessage(text, sender, isHtml = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    const img = document.createElement('img');
    img.src = sender === 'user'
        ? "https://cdn-icons-png.flaticon.com/512/1946/1946429.png"
        : "/static/assets/logo.png";
    avatarDiv.appendChild(img);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('content');

    if (isHtml) {
        contentDiv.innerHTML = linkify(text);
    } else {
        contentDiv.textContent = text;
    }

    if (sender === 'user') {
        msgDiv.appendChild(contentDiv);
        msgDiv.appendChild(avatarDiv);
    } else {
        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
    }

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    updateScrollButton();
}

async function sendMessage() {
    const text = userInput.innerText.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.innerHTML = '';
    userInput.style.height = 'auto'; // Скидаємо висоту

    loadingIndicator.classList.remove('hidden');
    updateSendButtonState();
    chatBox.appendChild(loadingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // --- ВИПРАВЛЕННЯ 2: Передаємо sessionId ---
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                sessionId: currentSessionId 
            })
        });

        const data = await response.json();

        // --- ВИПРАВЛЕННЯ 3: Зберігаємо нову сесію, якщо сервер її видав ---
        if (data.sessionId) {
            currentSessionId = data.sessionId;
            localStorage.setItem("chatSessionId", currentSessionId);
        }

        // Захист: якщо response прийшов пустим або undefined
        let cleanText = data.response || "Вибачте, я не отримав відповіді.";

        // Твоя логіка очистки тексту
        cleanText = cleanText.replace(
            /(^|\n)1\. ([^\n]+)(\n(?!2\. ).+)?(?=\n\n|$)/g,
            (match, start, item, extra) => {
                if (!/^\s*2\./m.test(extra || "")) {
                    return `${start}${item}${extra || ""}`;
                }
                return match;
            }
        );

        loadingIndicator.classList.add('hidden');
        updateSendButtonState();

        if (cleanText.length > 0) {
            addMessage(cleanText, 'bot', true);
        }

    } catch (error) {
        loadingIndicator.classList.add('hidden');
        // Тепер в консолі буде видно справжню помилку
        console.error("Деталі помилки:", error);
        addMessage("Помилка з'єднання. Спробуйте оновити сторінку.", 'bot');
    }
}

sendBtn.addEventListener('click', sendMessage);

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !sendBtn.classList.contains("disabled")) {
        e.preventDefault();
        sendMessage();
    }
});

clearBtn.addEventListener('click', () => {
    // Очищаємо сесію при очищенні чату (опціонально)
    localStorage.removeItem("chatSessionId");
    location.reload();
});

userInput.addEventListener("input", () => {
    if (userInput.innerText.trim() === "") {
        userInput.innerHTML = "";
    }
    updateSendButtonState(); // Оновлюємо кнопку
    updateScrollBtnPosition(); // Оновлюємо скрол
});

// Обробка вставки тексту (Paste)
userInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    
    // Вставляємо чистий текст
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(text));
    selection.collapseToEnd();
});


document.addEventListener("mousedown", (e) => {
    const isChatText = e.target.closest(".message .content");
    const isInput = e.target.closest("#user-input");

    if (!isChatText && !isInput) {
        window.getSelection()?.removeAllRanges();
    }
});

const scrollDownBtn = document.getElementById("scroll-down-btn"); // Повертаємо змінну

function updateScrollButton() {
    if (!scrollDownBtn) return;
    const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 140;
    if (nearBottom) {
        scrollDownBtn.classList.remove("show");
    } else {
        scrollDownBtn.classList.add("show");
    }
}

chatBox.addEventListener("scroll", updateScrollButton);

if (scrollDownBtn) {
    scrollDownBtn.addEventListener("click", () => {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
    });
}

function updateScrollBtnPosition() {
    if (!scrollBtn) return;
    const footerHeight = footer.offsetHeight;
    let offset = 20;
    if (window.innerWidth < 480) offset = 15;
    else if (window.innerWidth < 768) offset = 20;
    scrollBtn.style.bottom = (footerHeight + offset) + "px";
}

window.addEventListener("resize", updateScrollBtnPosition);
// userInput input вже має слухача вище
// chatBox scroll вже має слухача вище
updateScrollBtnPosition();

function updateClearButtonState() {
    const clearBtn = document.getElementById("clear-btn");
    const messages = [...document.querySelectorAll(".message")]
        .filter(m => !m.classList.contains("system-message"));
    clearBtn.classList.toggle("disabled", messages.length === 0);
}

// Observer для кнопки очищення
const observer = new MutationObserver(updateClearButtonState);
observer.observe(document.querySelector("main"), { childList: true });
updateClearButtonState();

function updateSendButtonState() {
    const textEmpty = userInput.innerText.trim().length === 0;
    const isLoading = !loadingIndicator.classList.contains("hidden");
    sendBtn.classList.toggle("disabled", textEmpty || isLoading);
}

// Observer для кнопки відправки
const observerSend = new MutationObserver(updateSendButtonState);
observerSend.observe(loadingIndicator, { attributes: true });
updateSendButtonState();

function linkify(text) {
    // Простий regex для посилань
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

userInput.spellcheck = false;
