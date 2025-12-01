import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.get('/airtable', (req, res) => {
  if (!process.env.AIRTABLE_CLIENT_ID || !process.env.AIRTABLE_OAUTH_CALLBACK_URL) {
    return res.status(500).json({ 
      error: 'OAuth not configured. Please set AIRTABLE_CLIENT_ID and AIRTABLE_OAUTH_CALLBACK_URL in environment variables.' 
    });
  }

  const params = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: process.env.AIRTABLE_OAUTH_CALLBACK_URL,
    response_type: 'code',
    scope: 'data.records:read data.records:write schema.bases:read',
    state: 'random-state-string'
  });

  const authUrl = `https://www.airtable.com/oauth2/v1/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

router.get('/airtable/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).json({ 
        error: `OAuth error: ${error}`,
        details: 'Please check your Airtable OAuth app configuration. Ensure the redirect_uri matches exactly in your Airtable app settings.'
      });
    }

    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    if (!process.env.AIRTABLE_CLIENT_ID || !process.env.AIRTABLE_CLIENT_SECRET || !process.env.AIRTABLE_OAUTH_CALLBACK_URL) {
      return res.status(500).json({ 
        error: 'OAuth not configured. Please set AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET, and AIRTABLE_OAUTH_CALLBACK_URL in environment variables.' 
      });
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.AIRTABLE_OAUTH_CALLBACK_URL,
      client_id: process.env.AIRTABLE_CLIENT_ID,
      client_secret: process.env.AIRTABLE_CLIENT_SECRET
    });

    const tokenResponse = await axios.post(
      'https://www.airtable.com/oauth2/v1/token',
      tokenParams.toString(),
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    const profileResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const profile = profileResponse.data;
    const airtableUserId = profile.id || profile.email || `user_${Date.now()}`;

    let user = await User.findOne({ airtableUserId });
    if (user) {
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.profile = profile;
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      user = await User.create({
        airtableUserId,
        profile,
        accessToken: access_token,
        refreshToken: refresh_token,
        lastLoginAt: new Date()
      });
    }

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.error === 'invalid_client' || errorData.error === 'invalid_grant') {
        return res.status(400).json({ 
          error: 'OAuth configuration error',
          details: errorData.error_description || 'Invalid client_id, client_secret, or redirect_uri. Please verify your Airtable OAuth app settings match your environment variables exactly.',
          hint: 'Ensure AIRTABLE_OAUTH_CALLBACK_URL matches exactly what you configured in Airtable (including http:// vs https:// and trailing slashes)'
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.response?.data?.error_description || error.message
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-accessToken -refreshToken');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;

