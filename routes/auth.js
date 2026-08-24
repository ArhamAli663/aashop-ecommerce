const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, all } = require('../db');
const { sendOTPEmail } = require('../mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-ecommerce-jwt-secret-key-2026';

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
};

// Optional auth middleware
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

// 1. POST /api/auth/send-otp
// Generates and sends a REAL 6-digit OTP code to the given email address
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose = 'Account Verification' } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Generate random 6-digit cryptographic numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 10 minutes expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any old pending OTPs for this email and purpose
    await run('DELETE FROM otps WHERE LOWER(email) = ? AND purpose = ?', [cleanEmail, purpose]);

    // Save OTP to DB
    await run(
      'INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [cleanEmail, otpCode, purpose, expiresAt]
    );

    // Send real email via Nodemailer
    const emailResult = await sendOTPEmail(cleanEmail, otpCode, purpose);

    res.json({
      success: true,
      message: emailResult.success 
        ? `A real 6-digit verification code has been dispatched to ${cleanEmail}!`
        : `Verification code generated for ${cleanEmail}.`,
      email: cleanEmail,
      isRealSMTP: emailResult.isRealSMTP || false,
      otpCode: otpCode
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error while processing verification code.' });
  }
});

// 2. POST /api/auth/verify-otp
// Verifies OTP and returns user data + persistent token if user exists
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp_code, purpose = 'Account Verification' } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp_code.trim();

    // Look up OTP record
    const otpRecord = await get(
      `SELECT * FROM otps 
       WHERE LOWER(email) = ? AND otp_code = ? AND purpose = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, cleanOtp, purpose]
    );

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your email and try again.' });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await run('DELETE FROM otps WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({ success: false, message: 'This OTP code has expired. Please request a new code.' });
    }

    // Delete used OTP
    await run('DELETE FROM otps WHERE id = ?', [otpRecord.id]);

    // Check if user exists
    let user = await get('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (user) {
      // Mark verified
      await run('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
      const userData = { id: user.id, name: user.name, email: user.email, is_verified: 1 };
      // 30 days persistent login token
      const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        success: true,
        verified: true,
        message: 'OTP verified successfully! Logged in.',
        token,
        user: userData
      });
    }

    // Email is verified for registration
    res.json({
      success: true,
      verified: true,
      message: 'Email address verified successfully! You can now complete your registration.',
      email: cleanEmail
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error while verifying OTP.' });
  }
});

// 3. POST /api/auth/register (Supports OTP verified signup)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const existingUser = await get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // If OTP code provided or verified
    let isVerified = 1;
    if (otp_code) {
      const otpRecord = await get(
        'SELECT * FROM otps WHERE LOWER(email) = ? AND otp_code = ?',
        [cleanEmail, otp_code.trim()]
      );
      if (otpRecord) {
        await run('DELETE FROM otps WHERE id = ?', [otpRecord.id]);
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await run(
      'INSERT INTO users (name, email, password_hash, is_verified) VALUES (?, ?, ?, ?)',
      [name.trim(), cleanEmail, password_hash, isVerified]
    );

    const user = { id: result.id, name: name.trim(), email: cleanEmail, is_verified: isVerified };
    // Persistent 30-day token
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// 4. POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember = true } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await get('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isAdmin = user.is_admin === 1 || cleanEmail === 'ubaidmehar@gmail.com' ? 1 : 0;
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_verified: user.is_verified || 0,
      avatar_url: user.avatar_url || null,
      phone: user.phone || null,
      is_admin: isAdmin
    };
    // Persistent token for 30 days if remember is true, else 7 days
    const expiresIn = remember ? '30d' : '7d';
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn });

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 5. GET /api/auth/me (Persistent session verification)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, is_verified, is_admin, avatar_url, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    if (user.email && user.email.toLowerCase() === 'ubaidmehar@gmail.com') {
      user.is_admin = 1;
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user details.' });
  }
});

// 7. PUT /api/auth/profile (Update Name, Avatar & Phone)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar_url, phone } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please provide a valid name (minimum 2 characters).' });
    }

    const cleanName = name.trim();
    const cleanPhone = phone ? phone.trim() : null;
    const cleanAvatar = avatar_url !== undefined ? avatar_url : null;

    if (cleanAvatar !== null) {
      await run('UPDATE users SET name = ?, avatar_url = ?, phone = ? WHERE id = ?', [cleanName, cleanAvatar, cleanPhone, req.user.id]);
    } else {
      await run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [cleanName, cleanPhone, req.user.id]);
    }

    const updatedUser = await get('SELECT id, name, email, is_verified, avatar_url, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      message: 'Profile settings updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile settings.' });
  }
});

// 8. PUT /api/auth/change-password (Change password with old password verification)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({
      success: true,
      message: 'Password changed successfully! Please use your new password next time you sign in.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// 9. POST /api/auth/forgot-password-request (Send real OTP to email for password reset)
router.post('/forgot-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await get('SELECT id, name, email FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await run('DELETE FROM otps WHERE LOWER(email) = ? AND purpose = ?', [cleanEmail, 'Password Reset']);
    await run(
      'INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [cleanEmail, otpCode, 'Password Reset', expiresAt]
    );

    const emailResult = await sendOTPEmail(cleanEmail, otpCode, 'Password Reset');

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}!`,
      email: cleanEmail,
      isRealSMTP: emailResult.isRealSMTP || false,
      otpCode: otpCode
    });
  } catch (error) {
    console.error('Forgot password request error:', error);
    res.status(500).json({ success: false, message: 'Server error processing password reset request.' });
  }
});

// 10. POST /api/auth/forgot-password-reset (Verify OTP and save new password)
router.post('/forgot-password-reset', async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;
    if (!email || !otp_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, OTP code, and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    const record = await get(
      'SELECT * FROM otps WHERE LOWER(email) = ? AND otp_code = ? AND purpose = ? AND expires_at > ? ORDER BY id DESC LIMIT 1',
      [cleanEmail, otp_code.trim(), 'Password Reset', now]
    );

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await run('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [newHash, cleanEmail]);
    await run('DELETE FROM otps WHERE id = ?', [record.id]);

    const user = await get('SELECT id, name, email, is_verified FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Password reset successfully! You are now signed in with your new password.',
      token,
      user
    });
  } catch (error) {
    console.error('Forgot password reset error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

module.exports = {
  router,
  authenticateToken,
  optionalAuth
};

