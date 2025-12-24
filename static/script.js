// Глобальные переменные
let questions = [];
let professions = [];
let rules = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
});

// Переключение вкладок
function showTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    if (tabName === 'test') {
        document.getElementById('test-tab').classList.add('active');
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else if (tabName === 'editor') {
        document.getElementById('editor-tab').classList.add('active');
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        loadEditorData();
    } else if (tabName === 'manage') {
        document.getElementById('manage-tab').classList.add('active');
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        loadKnowledgeBaseStats();
    }
}

// Загрузка вопросов для теста
async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        displayQuestions();
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
    }
}

// Отображение вопросов
function displayQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        
        let answersHTML = '';
        question.answers.forEach((answer, answerIndex) => {
            answersHTML += `
                <div class="answer-option">
                    <input type="radio" 
                           id="${question.id}_${answerIndex}" 
                           name="${question.id}" 
                           value="${answerIndex}">
                    <label for="${question.id}_${answerIndex}">${answer}</label>
                </div>
            `;
        });
        
        questionDiv.innerHTML = `
            <h3>${index + 1}. ${question.text}</h3>
            <div class="answers">
                ${answersHTML}
            </div>
        `;
        
        container.appendChild(questionDiv);
    });
}

// Отправка ответов и получение результатов
async function submitAnswers() {
    const answers = {};
    let allAnswered = true;
    
    questions.forEach(question => {
        const selected = document.querySelector(`input[name="${question.id}"]:checked`);
        if (selected) {
            answers[question.id] = selected.value;
        } else {
            allAnswered = false;
        }
    });
    
    if (!allAnswered) {
        alert('Пожалуйста, ответьте на все вопросы!');
        return;
    }
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers })
        });
        
        const data = await response.json();
        displayResults(data.recommendations);
    } catch (error) {
        console.error('Ошибка анализа:', error);
        alert('Произошла ошибка при анализе ответов');
    }
}

// Отображение результатов
function displayResults(recommendations) {
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
    
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.innerHTML = `
            <h3>${index + 1}. ${rec.name}</h3>
            <div class="percentage">${rec.percentage}% соответствие</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${rec.percentage}%"></div>
            </div>
            <p class="description">${rec.description}</p>
        `;
        
        resultsList.appendChild(card);
    });
}

// Сброс теста
function resetQuiz() {
    document.getElementById('quiz-container').style.display = 'block';
    document.getElementById('results-container').style.display = 'none';
    
    // Сбрасываем все ответы
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
    });
    
    // Прокручиваем наверх
    window.scrollTo(0, 0);
}

// Загрузка данных для редактора
async function loadEditorData() {
    try {
        const [questionsRes, professionsRes, rulesRes] = await Promise.all([
            fetch('/api/questions'),
            fetch('/api/professions'),
            fetch('/api/rules')
        ]);
        
        questions = await questionsRes.json();
        professions = await professionsRes.json();
        rules = await rulesRes.json();
        
        displayQuestionsEditor();
        displayProfessionsEditor();
        displayRulesEditor();
    } catch (error) {
        console.error('Ошибка загрузки данных редактора:', error);
    }
}

// Отображение редактора вопросов
function displayQuestionsEditor() {
    const container = document.getElementById('questions-editor');
    container.innerHTML = '';
    
    questions.forEach(question => {
        const item = document.createElement('div');
        item.className = 'editor-item';
        item.innerHTML = `
            <h4>${question.text}</h4>
            <p><strong>ID:</strong> ${question.id}</p>
            <p><strong>Варианты ответов:</strong> ${question.answers.join(', ')}</p>
            <div class="editor-actions">
                <button class="btn btn-secondary" onclick="editQuestion('${question.id}')">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteQuestion('${question.id}')">Удалить</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Отображение редактора профессий
function displayProfessionsEditor() {
    const container = document.getElementById('professions-editor');
    container.innerHTML = '';
    
    professions.forEach(profession => {
        const item = document.createElement('div');
        item.className = 'editor-item';
        item.innerHTML = `
            <h4>${profession.name}</h4>
            <p><strong>ID:</strong> ${profession.id}</p>
            <p><strong>Описание:</strong> ${profession.description}</p>
            <div class="editor-actions">
                <button class="btn btn-secondary" onclick="editProfession('${profession.id}')">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteProfession('${profession.id}')">Удалить</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Отображение редактора правил
function displayRulesEditor() {
    const container = document.getElementById('rules-editor');
    container.innerHTML = '';
    
    rules.forEach(rule => {
        const question = questions.find(q => q.id === rule.question_id);
        const questionText = question ? question.text : rule.question_id;
        
        const professionsText = Object.entries(rule.professions)
            .map(([id, weight]) => {
                const prof = professions.find(p => p.id === id);
                const profName = prof ? prof.name : id;
                return `${profName}: ${weight}`;
            })
            .join(', ');
        
        const item = document.createElement('div');
        item.className = 'editor-item';
        item.innerHTML = `
            <h4>Правило для: ${questionText}</h4>
            <p><strong>Вопрос ID:</strong> ${rule.question_id}</p>
            <p><strong>Профессии и веса:</strong> ${professionsText}</p>
            <div class="editor-actions">
                <button class="btn btn-secondary" onclick="editRule('${rule.question_id}')">Редактировать</button>
                <button class="btn btn-danger" onclick="deleteRule('${rule.question_id}')">Удалить</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Модальное окно
function showModal(content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
}

// Добавление вопроса
function showAddQuestionForm() {
    const content = `
        <h2>Добавить вопрос</h2>
        <form onsubmit="addQuestion(event)">
            <div class="form-group">
                <label>Текст вопроса:</label>
                <textarea id="question-text" required></textarea>
            </div>
            <button type="submit" class="btn btn-success">Добавить</button>
        </form>
    `;
    showModal(content);
}

async function addQuestion(event) {
    event.preventDefault();
    
    const text = document.getElementById('question-text').value;
    
    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Вопрос добавлен!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении вопроса');
    }
}

// Редактирование вопроса
function editQuestion(questionId) {
    const question = questions.find(q => q.id === questionId);
    
    const content = `
        <h2>Редактировать вопрос</h2>
        <form onsubmit="updateQuestion(event, '${questionId}')">
            <div class="form-group">
                <label>Текст вопроса:</label>
                <textarea id="question-text" required>${question.text}</textarea>
            </div>
            <button type="submit" class="btn btn-success">Сохранить</button>
        </form>
    `;
    showModal(content);
}

async function updateQuestion(event, questionId) {
    event.preventDefault();
    
    const text = document.getElementById('question-text').value;
    
    try {
        const response = await fetch(`/api/questions/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Вопрос обновлен!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении вопроса');
    }
}

// Удаление вопроса
async function deleteQuestion(questionId) {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) return;
    
    try {
        const response = await fetch(`/api/questions/${questionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadEditorData();
            alert('Вопрос удален!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении вопроса');
    }
}

// Добавление профессии
function showAddProfessionForm() {
    const content = `
        <h2>Добавить профессию</h2>
        <form onsubmit="addProfession(event)">
            <div class="form-group">
                <label>ID профессии:</label>
                <input type="text" id="profession-id" required>
            </div>
            <div class="form-group">
                <label>Название:</label>
                <input type="text" id="profession-name" required>
            </div>
            <div class="form-group">
                <label>Описание:</label>
                <textarea id="profession-description" required></textarea>
            </div>
            <button type="submit" class="btn btn-success">Добавить</button>
        </form>
    `;
    showModal(content);
}

async function addProfession(event) {
    event.preventDefault();
    
    const id = document.getElementById('profession-id').value;
    const name = document.getElementById('profession-name').value;
    const description = document.getElementById('profession-description').value;
    
    try {
        const response = await fetch('/api/professions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, description })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Профессия добавлена!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении профессии');
    }
}

// Редактирование профессии
function editProfession(professionId) {
    const profession = professions.find(p => p.id === professionId);
    
    const content = `
        <h2>Редактировать профессию</h2>
        <form onsubmit="updateProfession(event, '${professionId}')">
            <div class="form-group">
                <label>Название:</label>
                <input type="text" id="profession-name" value="${profession.name}" required>
            </div>
            <div class="form-group">
                <label>Описание:</label>
                <textarea id="profession-description" required>${profession.description}</textarea>
            </div>
            <button type="submit" class="btn btn-success">Сохранить</button>
        </form>
    `;
    showModal(content);
}

async function updateProfession(event, professionId) {
    event.preventDefault();
    
    const name = document.getElementById('profession-name').value;
    const description = document.getElementById('profession-description').value;
    
    try {
        const response = await fetch(`/api/professions/${professionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Профессия обновлена!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении профессии');
    }
}

// Удаление профессии
async function deleteProfession(professionId) {
    if (!confirm('Вы уверены, что хотите удалить эту профессию?')) return;
    
    try {
        const response = await fetch(`/api/professions/${professionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadEditorData();
            alert('Профессия удалена!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении профессии');
    }
}

// Добавление правила
function showAddRuleForm() {
    let questionsOptions = questions.map(q => 
        `<option value="${q.id}">${q.text}</option>`
    ).join('');
    
    let professionsCheckboxes = professions.map(p => `
        <div style="margin: 10px 0;">
            <label>
                <input type="checkbox" class="prof-checkbox" value="${p.id}">
                ${p.name}
            </label>
            <input type="number" id="weight-${p.id}" placeholder="Вес" style="width: 80px; margin-left: 10px;" disabled>
        </div>
    `).join('');
    
    const content = `
        <h2>Добавить правило</h2>
        <form onsubmit="addRule(event)">
            <div class="form-group">
                <label>Вопрос:</label>
                <select id="rule-question" required>
                    <option value="">Выберите вопрос</option>
                    ${questionsOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Профессии и веса:</label>
                ${professionsCheckboxes}
            </div>
            <button type="submit" class="btn btn-success">Добавить</button>
        </form>
    `;
    showModal(content);
    
    // Включаем/выключаем поля веса при выборе чекбоксов
    document.querySelectorAll('.prof-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const weightInput = document.getElementById(`weight-${this.value}`);
            weightInput.disabled = !this.checked;
            if (this.checked) weightInput.value = '1';
        });
    });
}

async function addRule(event) {
    event.preventDefault();
    
    const questionId = document.getElementById('rule-question').value;
    const professionsWeights = {};
    
    document.querySelectorAll('.prof-checkbox:checked').forEach(checkbox => {
        const weight = parseInt(document.getElementById(`weight-${checkbox.value}`).value) || 1;
        professionsWeights[checkbox.value] = weight;
    });
    
    if (Object.keys(professionsWeights).length === 0) {
        alert('Выберите хотя бы одну профессию!');
        return;
    }
    
    try {
        const response = await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question_id: questionId, 
                professions: professionsWeights 
            })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Правило добавлено!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении правила');
    }
}

// Редактирование правила
function editRule(questionId) {
    const rule = rules.find(r => r.question_id === questionId);
    const question = questions.find(q => q.id === questionId);
    
    let professionsCheckboxes = professions.map(p => {
        const weight = rule.professions[p.id] || '';
        const checked = rule.professions[p.id] !== undefined;
        
        return `
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" class="prof-checkbox" value="${p.id}" ${checked ? 'checked' : ''}>
                    ${p.name}
                </label>
                <input type="number" id="weight-${p.id}" value="${weight}" placeholder="Вес" 
                       style="width: 80px; margin-left: 10px;" ${checked ? '' : 'disabled'}>
            </div>
        `;
    }).join('');
    
    const content = `
        <h2>Редактировать правило</h2>
        <form onsubmit="updateRule(event, '${questionId}')">
            <div class="form-group">
                <label>Вопрос:</label>
                <p><strong>${question.text}</strong></p>
            </div>
            <div class="form-group">
                <label>Профессии и веса:</label>
                ${professionsCheckboxes}
            </div>
            <button type="submit" class="btn btn-success">Сохранить</button>
        </form>
    `;
    showModal(content);
    
    // Включаем/выключаем поля веса при выборе чекбоксов
    document.querySelectorAll('.prof-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const weightInput = document.getElementById(`weight-${this.value}`);
            weightInput.disabled = !this.checked;
            if (this.checked && !weightInput.value) weightInput.value = '1';
        });
    });
}

async function updateRule(event, questionId) {
    event.preventDefault();
    
    const professionsWeights = {};
    
    document.querySelectorAll('.prof-checkbox:checked').forEach(checkbox => {
        const weight = parseInt(document.getElementById(`weight-${checkbox.value}`).value) || 1;
        professionsWeights[checkbox.value] = weight;
    });
    
    if (Object.keys(professionsWeights).length === 0) {
        alert('Выберите хотя бы одну профессию!');
        return;
    }
    
    try {
        const response = await fetch(`/api/rules/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ professions: professionsWeights })
        });
        
        if (response.ok) {
            closeModal();
            loadEditorData();
            alert('Правило обновлено!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении правила');
    }
}

// Удаление правила
async function deleteRule(questionId) {
    if (!confirm('Вы уверены, что хотите удалить это правило?')) return;
    
    try {
        const response = await fetch(`/api/rules/${questionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadEditorData();
            alert('Правило удалено!');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении правила');
    }
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

// ============ УПРАВЛЕНИЕ БАЗАМИ ЗНАНИЙ ============

// Загрузка статистики базы знаний
async function loadKnowledgeBaseStats() {
    try {
        const response = await fetch('/api/knowledge-base');
        const kb = await response.json();
        
        const statsDiv = document.getElementById('kb-stats');
        statsDiv.innerHTML = `
            <p><strong>Вопросов:</strong> ${kb.questions.length}</p>
            <p><strong>Профессий:</strong> ${kb.professions.length}</p>
            <p><strong>Правил:</strong> ${kb.rules.length}</p>
        `;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        document.getElementById('kb-stats').innerHTML = '<p style="color: red;">Ошибка загрузки статистики</p>';
    }
}

// Создание новой пустой базы знаний
async function createNewKnowledgeBase() {
    if (!confirm('Вы уверены? Все текущие данные будут удалены и создана новая пустая база знаний.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/knowledge-base/create-new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Новая база знаний создана успешно!');
            loadKnowledgeBaseStats();
            // Обновляем вопросы на главной странице
            questions = [];
            displayQuestions();
        } else {
            alert('❌ Ошибка при создании базы знаний');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при создании базы знаний');
    }
}

// Обработка загрузки файла
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('upload-status');
    statusDiv.textContent = 'Загрузка...';
    statusDiv.className = '';
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Отправляем на сервер
        const response = await fetch('/api/knowledge-base/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.textContent = `✅ ${result.message}. Загружено: ${result.stats.questions} вопросов, ${result.stats.professions} профессий, ${result.stats.rules} правил.`;
            statusDiv.className = 'success';
            loadKnowledgeBaseStats();
            // Обновляем вопросы на главной странице
            await loadQuestions();
        } else {
            statusDiv.textContent = `❌ ${result.error}`;
            statusDiv.className = 'error';
        }
    } catch (error) {
        console.error('Ошибка:', error);
        statusDiv.textContent = `❌ Ошибка при загрузке файла: ${error.message}`;
        statusDiv.className = 'error';
    }
    
    // Сбрасываем input для возможности повторной загрузки того же файла
    event.target.value = '';
}

// Скачивание базы знаний
async function downloadKnowledgeBase() {
    try {
        const response = await fetch('/api/knowledge-base/download');
        const data = await response.json();
        
        // Создаем blob и скачиваем
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge_base_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ База знаний успешно скачана!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка при скачивании базы знаний');
    }
}
