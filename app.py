from flask import Flask, render_template, request, jsonify
import requests
import uuid
import os

app = Flask(__name__)

# --- СЮДИ ВСТАВ ПОСИЛАННЯ З N8N (Production URL) ---
# Воно має виглядати як https://.../webhook/chat
N8N_WEBHOOK_URL = "https://studentassistant-studentassistant.hf.space/webhook/chat" 
# (Я взяв його з твого скріну, але перевір, чи воно таке саме в ноді Webhook -> Production URL)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get('message')
    session_id = request.json.get('sessionId')

    # Якщо ID сесії немає, створюємо новий
    if not session_id:
        session_id = str(uuid.uuid4())

    if not user_input:
        return jsonify({"error": "No message"}), 400

    try:
        # Відправляємо запит на n8n
        payload = {
            "message": user_input,
            "sessionId": session_id
        }
        
        # Стукаємо в твій n8n
        response = requests.post(N8N_WEBHOOK_URL, json=payload)
        response.raise_for_status()
        
        # Отримуємо відповідь від n8n
        n8n_data = response.json()
        
        # Витягуємо текст відповіді
        bot_text = n8n_data.get('response', 'Помилка: n8n не повернув текст.')

        return jsonify({"response": bot_text, "sessionId": session_id})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"response": "Вибачте, сервіс тимчасово недоступний."}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)