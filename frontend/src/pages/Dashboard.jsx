import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Dashboard({ user, logout }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await axios.get(`${API_URL}/forms/forms`, {
        withCredentials: true
      });
      setForms(res.data.forms || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1>Form Builder Dashboard</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Welcome, {user.profile?.email || user.airtableUserId}
          </p>
        </div>
        <div>
          <Link to="/builder" className="btn btn-primary" style={{ marginRight: '10px', textDecoration: 'none' }}>
            Create New Form
          </Link>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Your Forms</h2>
        {loading ? (
          <div className="loading">Loading forms...</div>
        ) : forms.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
            No forms yet. Create your first form to get started.
          </p>
        ) : (
          <div>
            {forms.map(form => (
              <div key={form._id} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ marginBottom: '5px' }}>{form.title}</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                      Created: {new Date(form.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Link to={`/form/${form._id}`} className="btn btn-primary" style={{ marginRight: '10px', textDecoration: 'none' }}>
                      View Form
                    </Link>
                    <Link to={`/forms/${form._id}/responses`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                      Responses
                    </Link>
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

export default Dashboard;

