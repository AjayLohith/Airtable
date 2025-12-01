import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Responses() {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResponses();
  }, [formId]);

  const fetchResponses = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/forms/${formId}/responses`, {
        withCredentials: true
      });
      setResponses(res.data.responses || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      if (error.response?.status === 401) {
        alert('Please log in to view responses');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Form Responses</h1>
        <Link to="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading responses...</div>
        ) : responses.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            No responses yet.
          </p>
        ) : (
          <div>
            {responses.map(response => (
              <div key={response._id} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: '500', marginBottom: '5px' }}>
                      Response #{response._id.slice(-6)}
                    </p>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                      Airtable Record: {response.airtableRecordId}
                    </p>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                      Status: <span style={{ color: response.status === 'active' ? '#28a745' : '#dc3545' }}>
                        {response.status}
                      </span>
                    </p>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Submitted: {new Date(response.createdAt).toLocaleString()}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                      <strong>Preview:</strong>
                      {Object.entries(response.previewAnswers).map(([key, value]) => (
                        <div key={key} style={{ marginLeft: '10px', color: '#666' }}>
                          {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Responses;

