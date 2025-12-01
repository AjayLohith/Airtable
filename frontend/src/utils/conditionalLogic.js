export function shouldShowQuestion(rules, answersSoFar) {
  if (!rules || rules === null) {
    return true;
  }

  if (!rules.conditions || !Array.isArray(rules.conditions) || rules.conditions.length === 0) {
    return true;
  }

  const logic = rules.logic || 'AND';
  const conditionResults = rules.conditions.map(condition => {
    const { questionKey, operator, value } = condition;
    const answerValue = answersSoFar[questionKey];

    if (answerValue === undefined || answerValue === null || answerValue === '') {
      return false;
    }

    switch (operator) {
      case 'equals':
        return String(answerValue) === String(value);
      case 'notEquals':
        return String(answerValue) !== String(value);
      case 'contains':
        if (Array.isArray(answerValue)) {
          return answerValue.some(item => String(item).includes(String(value)));
        }
        return String(answerValue).includes(String(value));
      default:
        return false;
    }
  });

  if (logic === 'OR') {
    return conditionResults.some(result => result === true);
  } else {
    return conditionResults.every(result => result === true);
  }
}


