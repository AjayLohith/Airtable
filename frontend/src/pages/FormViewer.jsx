import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { shouldShowQuestion } from '../utils/conditionalLogic';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function FormViewer() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/forms/${formId}`);
      setForm(res.data.form);
    } catch (error) {
      console.error('Error fetching form:', error);
      if (error.response?.status === 404) {
        alert('Form not found');
      } else {
        alert('Error loading form. Please try again.');
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (questionKey, value) => {
    setAnswers({ ...answers, [questionKey]: value });
    if (errors[questionKey]) {
      setErrors({ ...errors, [questionKey]: null });
    }
  };

  const isFieldVisible = (question) => {
    return shouldShowQuestion(question.conditionalRules, answers);
  };

  const validate = () => {
    const newErrors = {};
    form.questions.forEach(question => {
      if (isFieldVisible(question) && question.required) {
        const answer = answers[question.questionKey];
        if (answer === undefined || answer === null || answer === '' ||
            (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question.questionKey] = 'This field is required';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/forms/forms/${formId}/submit`, { answers });
      setSuccess(true);
      setAnswers({});
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.join('\n');
        alert('Validation errors:\n' + errorMessages);
      } else {
        alert('Failed to submit form: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading form...</div>;
  }

  if (!form) {
    return <div className="loading">Form not found</div>;
  }

  return (
    <div>
      <div className="header">
        <h1>{form.title}</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {form.questions.map((question, index) => {
          if (!isFieldVisible(question)) {
            return null;
          }

          return (
            <div key={question.questionKey} className="form-group">
              <label>
                {question.label}
                {question.required && <span style={{ color: 'red' }}> *</span>}
              </label>

              {question.type === 'singleLineText' && (
                <input
                  type="text"
                  value={answers[question.questionKey] || ''}
                  onChange={(e) => updateAnswer(question.questionKey, e.target.value)}
                />
              )}

              {question.type === 'longText' && (
                <textarea
                  value={answers[question.questionKey] || ''}
                  onChange={(e) => updateAnswer(question.questionKey, e.target.value)}
                />
              )}

              {question.type === 'singleSelect' && (
                <select
                  value={answers[question.questionKey] || ''}
                  onChange={(e) => updateAnswer(question.questionKey, e.target.value)}
                >
                  <option value="">Select an option...</option>
                  {question.options?.choices?.map((choice, i) => (
                    <option key={i} value={choice.name || choice}>
                      {choice.name || choice}
                    </option>
                  ))}
                </select>
              )}

              {question.type === 'multipleSelects' && (
                <div>
                  {question.options?.choices?.map((choice, i) => {
                    const choiceValue = choice.name || choice;
                    const currentAnswers = answers[question.questionKey] || [];
                    const isChecked = Array.isArray(currentAnswers) && currentAnswers.includes(choiceValue);
                    return (
                      <label key={i} style={{ display: 'block', marginBottom: '5px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = answers[question.questionKey] || [];
                            if (e.target.checked) {
                              updateAnswer(question.questionKey, [...current, choiceValue]);
                            } else {
                              updateAnswer(question.questionKey, current.filter(v => v !== choiceValue));
                            }
                          }}
                        />
                        {choiceValue}
                      </label>
                    );
                  })}
                </div>
              )}

              {question.type === 'attachments' && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter file URL (e.g., https://example.com/file.pdf)"
                    value={answers[question.questionKey] || ''}
                    onChange={(e) => updateAnswer(question.questionKey, e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    For now, please provide a public URL to the file
                  </p>
                </div>
              )}

              {errors[question.questionKey] && (
                <div className="error">{errors[question.questionKey]}</div>
              )}
            </div>
          );
        })}

        {success && (
          <div className="success">Form submitted successfully!</div>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

export default FormViewer;

