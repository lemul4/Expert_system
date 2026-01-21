from flask import Flask, render_template, request, jsonify
import json
import os
from inference_engine import InferenceEngine

app = Flask(__name__)

KB_FILE = 'knowledge_base.json'

def load_knowledge_base():
    if not os.path.exists(KB_FILE):
        return {"questions": [], "professions": [], "rules": []}
    with open(KB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_knowledge_base(kb):
    with open(KB_FILE, 'w', encoding='utf-8') as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)

# Глобальная инициализация
knowledge_base = load_knowledge_base()
engine = InferenceEngine(knowledge_base)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify(knowledge_base.get('questions', []))

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    answers = data.get('answers', {})
    
    # Преобразуем строковые ключи в ID вопросов и значения в int
    numeric_answers = {}
    for q_id, answer_idx in answers.items():
        try:
            numeric_answers[q_id] = int(answer_idx)
        except ValueError:
            continue
    
    recommendations = engine.get_recommendations(numeric_answers, top_n=5)
    
    return jsonify({
        'success': True,
        'recommendations': recommendations
    })

@app.route('/api/professions', methods=['GET'])
def get_professions():
    """Получить все профессии"""
    return jsonify(knowledge_base['professions'])

@app.route('/api/rules', methods=['GET'])
def get_rules():
    """Получить все правила"""
    return jsonify(knowledge_base['rules'])


@app.route('/api/knowledge-base', methods=['GET'])
def get_knowledge_base():
    """Получить всю базу знаний"""
    return jsonify(knowledge_base)

@app.route('/api/knowledge-base/create-new', methods=['POST'])
def create_new_knowledge_base():
    """Создать новую пустую базу знаний"""
    global knowledge_base, engine
    
    # Создаем пустую структуру базы знаний
    knowledge_base = {
        "questions": [],
        "professions": [],
        "rules": []
    }
    
    save_knowledge_base(knowledge_base)
    engine = InferenceEngine(knowledge_base)
    
    return jsonify({
        'success': True,
        'message': 'Новая база знаний создана',
        'knowledge_base': knowledge_base
    })

@app.route('/api/knowledge-base/upload', methods=['POST'])
def upload_knowledge_base():
    """Загрузить базу знаний из JSON"""
    global knowledge_base, engine
    
    try:
        data = request.json
        
        # Валидация структуры
        if not isinstance(data, dict):
            return jsonify({'success': False, 'error': 'Неверный формат данных'}), 400
        
        if 'questions' not in data or 'professions' not in data or 'rules' not in data:
            return jsonify({'success': False, 'error': 'Отсутствуют обязательные поля: questions, professions, rules'}), 400
        
        # Проверяем, что это списки
        if not isinstance(data['questions'], list) or not isinstance(data['professions'], list) or not isinstance(data['rules'], list):
            return jsonify({'success': False, 'error': 'Поля questions, professions и rules должны быть массивами'}), 400
        
        # Загружаем новую базу знаний
        knowledge_base = data
        save_knowledge_base(knowledge_base)
        engine = InferenceEngine(knowledge_base)
        
        return jsonify({
            'success': True,
            'message': 'База знаний успешно загружена',
            'stats': {
                'questions': len(knowledge_base['questions']),
                'professions': len(knowledge_base['professions']),
                'rules': len(knowledge_base['rules'])
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': f'Ошибка при загрузке: {str(e)}'}), 500

@app.route('/api/knowledge-base/download', methods=['GET'])
def download_knowledge_base():
    """Скачать текущую базу знаний в формате JSON"""
    return jsonify(knowledge_base)

@app.route('/api/questions', methods=['POST'])
def add_question():
    """Добавить новый вопрос"""
    data = request.json
    
    # Генерируем ID для нового вопроса
    existing_ids = [q['id'] for q in knowledge_base['questions']]
    new_id = f"q{len(existing_ids) + 1}"
    
    new_question = {
        'id': new_id,
        'text': data['text'],
        'answers': data.get('answers', ["Точно нет", "Скорее нет", "Скорее да", "Да"])
    }
    
    knowledge_base['questions'].append(new_question)
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True, 'question': new_question})

@app.route('/api/questions/<question_id>', methods=['PUT'])
def update_question(question_id):
    """Обновить вопрос"""
    data = request.json
    
    for question in knowledge_base['questions']:
        if question['id'] == question_id:
            question['text'] = data.get('text', question['text'])
            question['answers'] = data.get('answers', question['answers'])
            save_knowledge_base(knowledge_base)
            return jsonify({'success': True, 'question': question})
    
    return jsonify({'success': False, 'error': 'Question not found'}), 404

@app.route('/api/questions/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Удалить вопрос"""
    knowledge_base['questions'] = [q for q in knowledge_base['questions'] if q['id'] != question_id]
    knowledge_base['rules'] = [r for r in knowledge_base['rules'] if r['question_id'] != question_id]
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True})

@app.route('/api/professions', methods=['POST'])
def add_profession():
    """Добавить новую профессию"""
    data = request.json
    
    new_profession = {
        'id': data['id'],
        'name': data['name'],
        'description': data['description']
    }
    
    knowledge_base['professions'].append(new_profession)
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True, 'profession': new_profession})

@app.route('/api/professions/<profession_id>', methods=['PUT'])
def update_profession(profession_id):
    """Обновить профессию"""
    data = request.json
    
    for profession in knowledge_base['professions']:
        if profession['id'] == profession_id:
            profession['name'] = data.get('name', profession['name'])
            profession['description'] = data.get('description', profession['description'])
            save_knowledge_base(knowledge_base)
            return jsonify({'success': True, 'profession': profession})
    
    return jsonify({'success': False, 'error': 'Profession not found'}), 404

@app.route('/api/professions/<profession_id>', methods=['DELETE'])
def delete_profession(profession_id):
    """Удалить профессию"""
    knowledge_base['professions'] = [p for p in knowledge_base['professions'] if p['id'] != profession_id]
    
    # Удаляем профессию из всех правил
    for rule in knowledge_base['rules']:
        if profession_id in rule['professions']:
            del rule['professions'][profession_id]
    
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True})

@app.route('/api/rules', methods=['POST'])
def add_rule():
    """Добавить новое правило"""
    data = request.json
    
    new_rule = {
        'question_id': data['question_id'],
        'professions': data['professions']
    }
    
    knowledge_base['rules'].append(new_rule)
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True, 'rule': new_rule})

@app.route('/api/rules/<question_id>', methods=['PUT'])
def update_rule(question_id):
    """Обновить правило"""
    data = request.json
    
    for rule in knowledge_base['rules']:
        if rule['question_id'] == question_id:
            rule['professions'] = data['professions']
            save_knowledge_base(knowledge_base)
            return jsonify({'success': True, 'rule': rule})
    
    return jsonify({'success': False, 'error': 'Rule not found'}), 404

@app.route('/api/rules/<question_id>', methods=['DELETE'])
def delete_rule(question_id):
    """Удалить правило"""
    knowledge_base['rules'] = [r for r in knowledge_base['rules'] if r['question_id'] != question_id]
    save_knowledge_base(knowledge_base)
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
