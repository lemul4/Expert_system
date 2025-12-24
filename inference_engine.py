"""
Движок логического вывода для экспертной системы профориентации
"""

class InferenceEngine:
    def __init__(self, knowledge_base):
        self.knowledge_base = knowledge_base
        
    def calculate_scores(self, answers):
        """
        Вычисляет баллы для каждой профессии на основе ответов
        answers: dict {question_id: answer_value} где answer_value: 0-3
        """
        profession_scores = {}
        
        # Инициализируем счетчики для каждой профессии
        for profession in self.knowledge_base['professions']:
            profession_scores[profession['id']] = {
                'score': 0,
                'max_score': 0,
                'name': profession['name'],
                'description': profession['description']
            }
        
        # Применяем правила
        for rule in self.knowledge_base['rules']:
            question_id = rule['question_id']
            
            if question_id not in answers:
                continue
                
            answer_value = answers[question_id]
            
            # Для каждой профессии в правиле
            for profession_id, weight in rule['professions'].items():
                if profession_id in profession_scores:
                    # Добавляем взвешенный балл
                    profession_scores[profession_id]['score'] += answer_value * weight
                    profession_scores[profession_id]['max_score'] += 3 * abs(weight)
        
        # Вычисляем процентное соответствие
        results = []
        for prof_id, data in profession_scores.items():
            if data['max_score'] > 0:
                percentage = (data['score'] / data['max_score']) * 100
            else:
                percentage = 0
                
            results.append({
                'id': prof_id,
                'name': data['name'],
                'description': data['description'],
                'score': data['score'],
                'max_score': data['max_score'],
                'percentage': round(percentage, 1)
            })
        
        # Сортируем по проценту соответствия
        results.sort(key=lambda x: x['percentage'], reverse=True)
        
        return results
    
    def get_recommendations(self, answers, top_n=3):
        """
        Возвращает топ N рекомендаций профессий
        """
        all_results = self.calculate_scores(answers)
        return all_results[:top_n]
