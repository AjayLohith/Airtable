import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function FormBuilder({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBases();
  }, []);

  useEffect(() => {
    if (selectedBase) {
      fetchTables();
    }
  }, [selectedBase]);

  useEffect(() => {
    if (selectedBase && selectedTable) {
      fetchFields();
    }
  }, [selectedBase, selectedTable]);

  const fetchBases = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/me/bases`, {
        withCredentials: true
      });
      setBases(res.data.bases || []);
    } catch (error) {
      console.error('Error fetching bases:', error);
      if (error.response?.status === 401) {
        alert('Please log in again');
        window.location.href = '/login';
      } else {
        alert('Failed to load Airtable bases. Please try again.');
      }
    }
  };

  const fetchTables = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/me/bases/${selectedBase}/tables`, {
        withCredentials: true
      });
      setTables(res.data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables. Please try again.');
    }
  };

  const fetchFields = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/me/bases/${selectedBase}/tables/${selectedTable}/fields`, {
        withCredentials: true
      });
      setFields(res.data.fields || []);
    } catch (error) {
      console.error('Error fetching fields:', error);
      alert('Failed to load fields. Please try again.');
    }
  };

  const handleFieldToggle = (field) => {
    const exists = selectedFields.find(f => f.airtableFieldId === field.id);
    if (exists) {
      setSelectedFields(selectedFields.filter(f => f.airtableFieldId !== field.id));
    } else {
      setSelectedFields([...selectedFields, {
        questionKey: `q${selectedFields.length + 1}`,
        airtableFieldId: field.id,
        label: field.name,
        type: field.mappedType,
        required: false,
        conditionalRules: null,
        options: field.options || {}
      }]);
    }
  };

  const updateField = (index, updates) => {
    const updated = [...selectedFields];
    updated[index] = { ...updated[index], ...updates };
    setSelectedFields(updated);
  };

  const addCondition = (fieldIndex) => {
    const field = selectedFields[fieldIndex];
    const otherFields = selectedFields.filter((_, i) => i < fieldIndex);
    
    if (!field.conditionalRules) {
      updateField(fieldIndex, {
        conditionalRules: {
          logic: 'AND',
          conditions: [{
            questionKey: otherFields[0]?.questionKey || '',
            operator: 'equals',
            value: ''
          }]
        }
      });
    }
  };

  const updateCondition = (fieldIndex, conditionIndex, updates) => {
    const field = selectedFields[fieldIndex];
    const conditions = [...field.conditionalRules.conditions];
    conditions[conditionIndex] = { ...conditions[conditionIndex], ...updates };
    updateField(fieldIndex, {
      conditionalRules: { ...field.conditionalRules, conditions }
    });
  };

  const addConditionToField = (fieldIndex) => {
    const field = selectedFields[fieldIndex];
    const otherFields = selectedFields.filter((_, i) => i < fieldIndex);
    updateField(fieldIndex, {
      conditionalRules: {
        ...field.conditionalRules,
        conditions: [...field.conditionalRules.conditions, {
          questionKey: otherFields[0]?.questionKey || '',
          operator: 'equals',
          value: ''
        }]
      }
    });
  };

  const removeCondition = (fieldIndex, conditionIndex) => {
    const field = selectedFields[fieldIndex];
    const conditions = field.conditionalRules.conditions.filter((_, i) => i !== conditionIndex);
    if (conditions.length === 0) {
      updateField(fieldIndex, { conditionalRules: null });
    } else {
      updateField(fieldIndex, {
        conditionalRules: { ...field.conditionalRules, conditions }
      });
    }
  };

  const handleSubmit = async () => {
    if (!formTitle || selectedFields.length === 0) {
      alert('Please provide a title and select at least one field');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/forms/forms`, {
        airtableBaseId: selectedBase,
        airtableTableId: selectedTable,
        title: formTitle,
        questions: selectedFields
      }, {
        withCredentials: true
      });
      navigate(`/form/${res.data.form._id}`);
    } catch (error) {
      console.error('Error creating form:', error);
      if (error.response?.status === 401) {
        alert('Please log in again');
        window.location.href = '/login';
      } else {
        alert('Failed to create form: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Create New Form</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Cancel
        </button>
      </div>

      {step === 1 && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Step 1: Select Base and Table</h2>
          <div className="form-group">
            <label>Select Airtable Base</label>
            <select value={selectedBase} onChange={(e) => setSelectedBase(e.target.value)}>
              <option value="">Choose a base...</option>
              {bases.map(base => (
                <option key={base.id} value={base.id}>{base.name}</option>
              ))}
            </select>
          </div>
          {selectedBase && (
            <div className="form-group">
              <label>Select Table</label>
              <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                <option value="">Choose a table...</option>
                {tables.map(table => (
                  <option key={table.id} value={table.id}>{table.name}</option>
                ))}
              </select>
            </div>
          )}
          {selectedTable && (
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next: Configure Fields
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Step 2: Configure Form</h2>
          <div className="form-group">
            <label>Form Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter form title"
            />
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Select Fields</h3>
          {fields.map(field => (
            <div key={field.id} style={{ marginBottom: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedFields.some(f => f.airtableFieldId === field.id)}
                  onChange={() => handleFieldToggle(field)}
                />
                {field.name} ({field.mappedType})
              </label>
            </div>
          ))}

          {selectedFields.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '15px' }}>Configure Selected Fields</h3>
              {selectedFields.map((field, index) => (
                <div key={index} className="card" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Question Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>

                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong>Conditional Rules</strong>
                      {!field.conditionalRules && (
                        <button className="btn btn-secondary" onClick={() => addCondition(index)}>
                          Add Condition
                        </button>
                      )}
                    </div>

                    {field.conditionalRules && (
                      <div>
                        <div className="form-group">
                          <label>Logic</label>
                          <select
                            value={field.conditionalRules.logic}
                            onChange={(e) => updateField(index, {
                              conditionalRules: { ...field.conditionalRules, logic: e.target.value }
                            })}
                          >
                            <option value="AND">AND (all conditions must be true)</option>
                            <option value="OR">OR (any condition must be true)</option>
                          </select>
                        </div>

                        {field.conditionalRules.conditions.map((condition, condIndex) => {
                          const otherFields = selectedFields.filter((_, i) => i < index);
                          return (
                            <div key={condIndex} className="card" style={{ marginBottom: '10px', padding: '15px' }}>
                              <div className="form-group">
                                <label>Show this field if</label>
                                <select
                                  value={condition.questionKey}
                                  onChange={(e) => updateCondition(index, condIndex, { questionKey: e.target.value })}
                                >
                                  <option value="">Select field...</option>
                                  {otherFields.map(f => (
                                    <option key={f.questionKey} value={f.questionKey}>{f.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Operator</label>
                                <select
                                  value={condition.operator}
                                  onChange={(e) => updateCondition(index, condIndex, { operator: e.target.value })}
                                >
                                  <option value="equals">equals</option>
                                  <option value="notEquals">not equals</option>
                                  <option value="contains">contains</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Value</label>
                                <input
                                  type="text"
                                  value={condition.value}
                                  onChange={(e) => updateCondition(index, condIndex, { value: e.target.value })}
                                />
                              </div>
                              <button className="btn btn-secondary" onClick={() => removeCondition(index, condIndex)}>
                                Remove Condition
                              </button>
                            </div>
                          );
                        })}

                        <button className="btn btn-secondary" onClick={() => addConditionToField(index)}>
                          Add Another Condition
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormBuilder;

