import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';
import { refreshAccessToken } from '../utils/airtable.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
}

export async function getValidAccessToken(user) {
  try {
    await axios.get('https://api.airtable.com/v0/meta/bases', {
      headers: { 'Authorization': `Bearer ${user.accessToken}` }
    });
    return user.accessToken;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        const tokenData = await refreshAccessToken(user.refreshToken);
        user.accessToken = tokenData.access_token;
        if (tokenData.refresh_token) {
          user.refreshToken = tokenData.refresh_token;
        }
        await user.save();
        return user.accessToken;
      } catch (refreshError) {
        throw new Error('Failed to refresh access token');
      }
    }
    throw error;
  }
}

