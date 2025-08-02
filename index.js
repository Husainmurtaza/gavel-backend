const express = require('express');
const mongoose = require('mongoose');
const Client = require('./models/client');
const Candidate = require('./models/candidate');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Admin = require('./models/admin');
const Position = require('./models/position');
const Interview = require('./models/interview');
const Company = require('./models/company');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gavel';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-domain.com'],
  credentials: true
}));
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connection successful');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Basic route
app.get('/', (req, res) => {
  res.send('Express server is running!');
});

// Auth middleware
function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Session expired. Please login again.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

// Example protected route for client dashboard
app.get('/api/protected/client', authenticate, (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ message: 'Forbidden' });
  res.json({ message: 'Welcome to the client dashboard!' });
});

// Example protected route for candidate dashboard
app.get('/api/protected/candidate', authenticate, async (req, res) => {
  if (req.user.role !== 'candidate') return res.status(403).json({ message: 'Forbidden' });
  // Fetch candidate info from DB
  try {
    const candidate = await Candidate.findById(req.user.id).select('email firstName _id');
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json({ id: candidate._id, email: candidate.email, firstName: candidate.firstName });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Signup route for Client
app.post('/api/signup/client', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existing = await Client.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = new Client({ firstName, lastName, email, phone, password: hashedPassword });
    await client.save();
    res.status(201).json({ message: 'Client registered successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Signup route for Candidate
app.post('/api/signup/candidate', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existing = await Candidate.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists. Please use a different email.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const candidate = new Candidate({ firstName, lastName, email, phone, password: hashedPassword });
    await candidate.save();
    res.status(201).json({ message: 'Candidate registered successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login route for Client
app.post('/api/login/client', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const client = await Client.findOne({ email });
  if (!client) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const isMatch = await bcrypt.compare(password, client.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const clientToken = jwt.sign({ id: client._id, role: 'client' }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', clientToken, { httpOnly: true, maxAge: 3600000 });
  res.json({ message: 'Login successful', redirect: '/dashboard' });
});

// Login route for Candidate
app.post('/api/login/candidate', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const candidate = await Candidate.findOne({ email });
  if (!candidate) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const isMatch = await bcrypt.compare(password, candidate.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const candidateToken = jwt.sign({ id: candidate._id, role: 'candidate' }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', candidateToken, { httpOnly: true, maxAge: 3600000 });
  res.json({ message: 'Login successful', redirect: '/candidate' });
});

// Login route for Admin
app.post('/api/login/admin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const adminToken = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', adminToken, { httpOnly: true, maxAge: 3600000 });
  res.json({ message: 'Admin login successful', redirect: '/admin' });
});

// Logout route (destroy session)
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Protected route for admin dashboard
app.get('/api/protected/admin', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  // Optionally fetch admin info from DB
  try {
    const admin = await Admin.findById(req.user.id).select('email _id');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ id: admin._id, email: admin.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET positions: populate company
app.get('/api/positions', authenticate, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'candidate') return res.status(403).json({ message: 'Forbidden' });
  try {
    const positions = await Position.find({}, { name: 1, projectDescription: 1, company: 1, redFlag: 1 }).populate('company', 'name');
    res.json(positions.map(pos => ({
      id: pos._id,
      name: pos.name,
      projectDescription: pos.projectDescription,
      company: pos.company ? pos.company._id : '',
      companyName: pos.company ? pos.company.name : '',
      redFlag: pos.redFlag || ''
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST positions: accept company and redFlag
app.post('/api/positions', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, projectDescription, company, redFlag } = req.body;
  if (!name) return res.status(400).json({ message: 'Position name is required.' });
  try {
    const position = new Position({ name, projectDescription, company, redFlag });
    await position.save();
    res.status(201).json({ id: position._id, name: position.name, projectDescription: position.projectDescription, company: position.company, redFlag: position.redFlag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// PUT positions: accept company and redFlag
app.put('/api/positions/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name, projectDescription, company, redFlag } = req.body;
  if (!name) return res.status(400).json({ message: 'Position name is required.' });
  try {
    const position = await Position.findByIdAndUpdate(
      req.params.id,
      { name, projectDescription, company, redFlag },
      { new: true }
    );
    if (!position) return res.status(404).json({ message: 'Position not found.' });
    res.json({ id: position._id, name: position.name, projectDescription: position.projectDescription, company: position.company, redFlag: position.redFlag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/positions/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const position = await Position.findByIdAndDelete(req.params.id);
    if (!position) return res.status(404).json({ message: 'Position not found.' });
    res.json({ message: 'Position deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CRUD for Companies (admin only)
app.get('/api/companies', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const companies = await Company.find({}, { name: 1 });
    res.json(companies.map(c => ({ id: c._id, name: c.name })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/companies', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Company name is required.' });
  try {
    const existing = await Company.findOne({ name });
    if (existing) return res.status(409).json({ message: 'Company already exists.' });
    const company = new Company({ name });
    await company.save();
    res.status(201).json({ id: company._id, name: company.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/companies/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Company name is required.' });
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!company) return res.status(404).json({ message: 'Company not found.' });
    res.json({ id: company._id, name: company.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/companies/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found.' });
    res.json({ message: 'Company deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CRUD for Clients (admin only)
app.get('/api/clients', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const clients = await Client.find({ deleted: { $ne: true } }, { firstName: 1, lastName: 1, email: 1, phone: 1, company: 1, redFlag: 1 }).populate('company', 'name');
    res.json(clients.map(c => ({
      id: c._id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      company: c.company ? { id: c.company._id, name: c.company.name } : null,
      redFlag: c.redFlag || ''
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/clients', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { firstName, lastName, email, phone, password, company, redFlag } = req.body;
  if (!firstName || !lastName || !email || !phone || !password) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const existing = await Client.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = new Client({ firstName, lastName, email, phone, password: hashedPassword, company, redFlag });
    await client.save();
    res.status(201).json({ id: client._id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, company: client.company, redFlag: client.redFlag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/clients/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { firstName, lastName, email, phone, company, redFlag } = req.body;
  if (!firstName || !lastName || !email || !phone) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, { firstName, lastName, email, phone, company, redFlag }, { new: true });
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    res.json({ id: client._id, firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone, company: client.company, redFlag: client.redFlag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/clients/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, { deleted: true });
    if (!client) return res.status(404).json({ message: 'Client not found.' });
    res.json({ message: 'Client deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// CRUD for Candidates (admin only)
app.get('/api/candidates', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const candidates = await Candidate.find({ deleted: { $ne: true } }, { firstName: 1, lastName: 1, email: 1, phone: 1 });
    res.json(candidates.map(c => ({ id: c._id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone })));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/candidates', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { firstName, lastName, email, phone, password } = req.body;
  if (!firstName || !lastName || !email || !phone || !password) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const existing = await Candidate.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const candidate = new Candidate({ firstName, lastName, email, phone, password: hashedPassword });
    await candidate.save();
    res.status(201).json({ id: candidate._id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email, phone: candidate.phone });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/candidates/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const { firstName, lastName, email, phone } = req.body;
  if (!firstName || !lastName || !email || !phone) return res.status(400).json({ message: 'All fields are required.' });
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, { firstName, lastName, email, phone }, { new: true });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found.' });
    res.json({ id: candidate._id, firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email, phone: candidate.phone });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/candidates/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, { deleted: true });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found.' });
    res.json({ message: 'Candidate deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Save interview result (webhook endpoint)
app.post('/api/interviews', async (req, res) => {
  console.log("📥 Received data at /api/interviews:", req.body);
  try {
    const { positionName, candidateId, email, interviewID, positionDescription, positionId, summary, transcript, status } = req.body;
    if (!positionName || !candidateId || !email || !interviewID || !positionId) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const interview = new Interview({
      positionName,
      candidateId,
      email,
      interviewID,
      positionDescription,
      positionId,
      summary,
      transcript,
      status,
      reviewStatus: 'pending'
    });
    await interview.save();
    res.status(201).json({ message: 'Interview saved successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if candidate has already applied for a position
app.get('/api/interviews/check', async (req, res) => {
  const { candidateId, positionId } = req.query;
  if (!candidateId || !positionId) {
    return res.status(400).json({ message: 'Missing candidateId or positionId' });
  }
  try {
    const exists = await Interview.exists({ candidateId, positionId });
    res.json({ applied: !!exists });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all interviews for the logged-in candidate with pagination
app.get('/api/interviews', authenticate, async (req, res) => {
  if (req.user.role !== 'candidate') return res.status(403).json({ message: 'Forbidden' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const candidateId = String(req.user.id);
    const total = await Interview.countDocuments({ candidateId });
    const interviews = await Interview.find({ candidateId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ total, page, limit, interviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a single interview by id for the logged-in candidate
app.get('/api/interviews/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'candidate') return res.status(403).json({ message: 'Forbidden' });
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview || String(interview.candidateId) !== String(req.user.id)) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Get all interviews
app.get('/api/admin/interviews', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const interviews = await Interview.find({});
    res.json(interviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Approve interview
app.put('/api/admin/interviews/:id/approve', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'approved' },
      { new: true }
    );
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Reject interview
app.put('/api/admin/interviews/:id/reject', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'rejected' },
      { new: true }
    );
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 