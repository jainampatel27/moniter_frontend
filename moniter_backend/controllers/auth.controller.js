const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// JWT_SECRET presence is enforced at startup in index.js
const JWT_SECRET = process.env.JWT_SECRET;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 1)
            return res.status(400).json({ error: 'Name is required.' });
        if (!email || !EMAIL_RE.test(email))
            return res.status(400).json({ error: 'A valid email is required.' });
        if (!password || typeof password !== 'string' || password.length < 8)
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase(),
                password: hashedPassword,
            },
        });

        res.status(201).json({ message: 'User created successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        // Find user
        const user = await prisma.user.findUnique({ where: { email: (email || '').toLowerCase() } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password
        const isMatched = await bcrypt.compare(password, user.password);
        if (!isMatched) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const me = async (req, res) => {
    // req.user is set by authMiddleware
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } });
};

const logout = async (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

module.exports = {
    signup,
    login,
    me,
    logout
};
