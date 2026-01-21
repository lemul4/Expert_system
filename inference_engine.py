"""
Движок логического вывода на основе Коэффициентов Уверенности Шортлиффа (Certainty Factors)
"""

class InferenceEngine:
    def __init__(self, knowledge_base):
        self.knowledge_base = knowledge_base
        
    def _combine_cf(self, cf1, cf2):
        """
        Формула объединения двух независимых коэффициентов уверенности (Шортлифф).
        """
        # усиление уверенности
        if cf1 > 0 and cf2 > 0:
            return cf1 + cf2 - (cf1 * cf2)
        
        # усиление недоверия
        elif cf1 < 0 and cf2 < 0:
            return cf1 + cf2 + (cf1 * cf2)
            
        else:
            denominator = 1 - min(abs(cf1), abs(cf2))
            if denominator == 0:
                return 0
            return (cf1 + cf2) / denominator

    def calculate_scores(self, answers):
            """
            Полный расчет коэффициентов уверенности на основе ответов.
            """
            # 1. Инициализация счетчиков для всех профессий нулями
            profession_cfs = {prof['id']: 0.0 for prof in self.knowledge_base['professions']}
            
            # 2. Маппинг ответов пользователя в Evidence CF
            # 0..3 -> -1.0..+1.0
            answer_to_cf = {
                0: -1.0,  # Точно нет
                1: -0.5,  # Скорее нет
                2: 0.5,   # Скорее да
                3: 1.0    # Да
            }
            
            # --- (Словарь weight_to_rule_cf УДАЛЕН, так как в JSON уже дробные числа) ---

            # 3. Проход по всем правилам
            for rule in self.knowledge_base['rules']:
                q_id = rule['question_id']
                
                # Если пользователь не ответил на вопрос, пропускаем
                if q_id not in answers:
                    continue
                    
                # Получаем уверенность пользователя (Evidence)
                user_val = answers[q_id]
                evidence_cf = answer_to_cf.get(user_val, 0)
                
                # --- ФИЛЬТР ШУМА (Threshold) ---
                # Если пользователь ответил "Не знаю" (0) или его уверенность слишком мала (< 0.2),
                # правило не срабатывает. Это стандарт MYCIN.
                if abs(evidence_cf) < 0.2:
                    continue

                # 4. Проход по профессиям внутри правила
                for prof_id, weight in rule['professions'].items():
                    if prof_id not in profession_cfs:
                        continue
                    
                    # --- ЛОГИКА РАБОТЫ С ПРЯМЫМИ ВЕСАМИ ИЗ JSON ---
                    # weight в JSON может быть 0.9 или -0.4
                    
                    # Сила правила (Rule CF) — это всегда положительное число (модуль)
                    rule_strength = abs(weight)
                    
                    # Знак определяет, усиливаем мы (1) или ослабляем (-1)
                    sign = -1 if weight < 0 else 1 
                    
                    # ВЫВОД (Rule Propagation):
                    # Результат = Уверенность юзера * Сила правила * Знак направления
                    current_rule_result = evidence_cf * rule_strength * sign
                    
                    # Дополнительный фильтр: если итоговое влияние микроскопическое, игнорируем
                    if abs(current_rule_result) < 0.2:
                        continue

                    # --- АГРЕГАЦИЯ (Combination) ---
                    # Объединяем старое значение с новым результатом
                    old_cf = profession_cfs[prof_id]
                    new_cf = self._combine_cf(old_cf, current_rule_result)
                    
                    # Сохраняем новое значение
                    profession_cfs[prof_id] = new_cf

            # 5. Формирование итогового списка
            results = []
            prof_map = {p['id']: p for p in self.knowledge_base['professions']}
            
            for prof_id, cf in profession_cfs.items():
                prof_data = prof_map.get(prof_id)
                if not prof_data:
                    continue
                    
                # Конвертация в проценты для отображения (только положительные)
                display_percentage = max(0, cf * 100)
                
                results.append({
                    'id': prof_id,
                    'name': prof_data['name'],
                    'description': prof_data['description'],
                    'raw_cf': round(cf, 4),               # Сырой коэффициент (-1..1)
                    'percentage': round(display_percentage, 1) # Проценты (0..100%)
                })
                
            # Сортируем: сначала самые подходящие
            results.sort(key=lambda x: x['raw_cf'], reverse=True)
            
            return results
    
    def get_recommendations(self, answers, top_n=3):
        all_results = self.calculate_scores(answers)
        positive_results = [r for r in all_results if r['raw_cf'] > 0]
        return all_results