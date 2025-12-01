import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Login({ onLogin }) {
  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/airtable`;
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
      <div className="card">
        <h1 style={{ marginBottom: '20px' }}>Airtable Form Builder</h1>
        <p style={{ marginBottom: '30px', color: '#666' }}>
          Connect your Airtable account to start building dynamic forms
        </p>
        <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%' }}>
          Login with Airtable
        </button>
      </div>
    </div>
  );
}

export default Login;


