// ─────────────────────────────────────────────────────────────
//  WZ CHAMPIONSHIP — EXPRESS SERVER v5.1
//  Suporte: Local (db.json) + Nuvem (MongoDB Atlas via MONGODB_URL)
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3333;
const DB_FILE = path.join(__dirname, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'wzchamp_super_secret_2026';
const MONGODB_URL = process.env.MONGODB_URL || '';

// Serve static files but WITHOUT auto-index (we control / manually)
app.use(cors({ origin:'*' }));
app.use(express.json());
app.use(express.static(__dirname, { index: false }));
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const MP_TOKEN   = process.env.MP_ACCESS_TOKEN   || '';
let stripe, mpClient;
try { if(STRIPE_KEY) stripe = require('stripe')(STRIPE_KEY); } catch {}
try {
  if(MP_TOKEN) {
    const { MercadoPagoConfig } = require('mercadopago');
    mpClient = new MercadoPagoConfig({ accessToken: MP_TOKEN });
  }
} catch {}

// ── PLANOS ──
const PLANS = {
  free:  { name:'FREE',  priceBRL:0,    features:['view_standings'] },
  pro:   { name:'PRO',   priceBRL:2990, features:['view_standings','create_championship','live_overlay'] },
  elite: { name:'ELITE', priceBRL:7990, features:['view_standings','create_championship','live_overlay','multi_championship','priority_support'] },
};

// ══════════════════════════════════════════════════════
//  DATABASE LAYER — usa MongoDB se tiver MONGODB_URL,
//  senão usa db.json local
// ══════════════════════════════════════════════════════

let usesMongo = false;

// ── MongoDB Schema ──
const userSchema = new mongoose.Schema({
  id:{ type:String, unique:true },
  nickname:String, email:{ type:String, unique:true },
  passwordHash:String, role:{ type:String, default:'user' },
  plan:{ type:String, default:'free' }, status:{ type:String, default:'pending' },
  createdAt:String, stripeCustomerId:String,
  subscriptionId:String, subscriptionExpiry:String,
});
let User;

async function connectMongo() {
  await mongoose.connect(MONGODB_URL);
  User = mongoose.model('User', userSchema);
  usesMongo = true;
  console.log('  ✓ MongoDB conectado');
  // Seed admin se não existir
  const admin = await User.findOne({ id:'admin-001' });
  if (!admin) {
    const hash = await bcrypt.hash('wzchamp2026', 10);
    await User.create({
      id:'admin-001', nickname:'Admin', email:'admin@wzchamp.gg',
      passwordHash:hash, role:'admin', plan:'elite', status:'active',
      createdAt: new Date().toISOString(),
    });
    console.log('  ✓ Admin criado no MongoDB');
  }
}

// ── JSON fallback ──
function readDB()  { try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return {users:[],championships:[]}; } }
function writeDB(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2)); }

// ── Unified DB helpers ──
const db = {
  async findUser(query) {
    if (usesMongo) return User.findOne(query).lean();
    const d = readDB();
    if (query.id)    return d.users.find(u => u.id === query.id) || null;
    if (query.email) return d.users.find(u => u.email === query.email) || null;
    if (query.nickname) return d.users.find(u => u.nickname?.toLowerCase() === query.nickname?.toLowerCase()) || null;
    return null;
  },
  async allUsers() {
    if (usesMongo) return User.find().lean();
    return readDB().users;
  },
  async createUser(data) {
    if (usesMongo) return User.create(data);
    const d = readDB(); d.users.push(data); writeDB(d); return data;
  },
  async updateUser(id, update) {
    if (usesMongo) return User.findOneAndUpdate({ id }, update, { new:true }).lean();
    const d = readDB();
    const i = d.users.findIndex(u => u.id === id);
    if (i < 0) return null;
    Object.assign(d.users[i], update); writeDB(d); return d.users[i];
  },
};

// ── MIDDLEWARE ──
app.use(cors({ origin:'*' }));
app.use(express.json());
app.use(express.static(__dirname));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error:'Token necessário' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error:'Token inválido ou expirado' }); }
}
function adminOnly(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error:'Admin necessário' });
    next();
  });
}

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { nickname, email, password } = req.body;
    if (!nickname || !email || !password) return res.status(400).json({ error:'Preencha todos os campos' });
    if (password.length < 6) return res.status(400).json({ error:'Senha mínima: 6 caracteres' });
    if (await db.findUser({ email: email.toLowerCase() })) return res.status(409).json({ error:'Email já cadastrado' });
    if (await db.findUser({ nickname })) return res.status(409).json({ error:'Nickname já em uso' });
    const passwordHash = await bcrypt.hash(password, 10);
    await db.createUser({
      id:`u${Date.now()}`, nickname:nickname.trim(),
      email:email.toLowerCase().trim(), passwordHash,
      role:'user', plan:'free', status:'pending',
      createdAt:new Date().toISOString(),
      stripeCustomerId:null, subscriptionId:null, subscriptionExpiry:null,
    });
    res.json({ message:'Conta criada! Aguardando aprovação do Admin.' });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.findUser({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ error:'Email ou senha incorretos' });
    if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error:'Email ou senha incorretos' });
    if (user.status === 'pending') return res.status(403).json({ error:'Aguardando aprovação do Admin' });
    if (user.status === 'banned')  return res.status(403).json({ error:'Conta suspensa' });
    const token = jwt.sign(
      { id:user.id, nickname:user.nickname, email:user.email, role:user.role, plan:user.plan },
      JWT_SECRET, { expiresIn:'7d' }
    );
    res.json({ token, user:{ id:user.id, nickname:user.nickname, email:user.email, role:user.role, plan:user.plan } });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await db.findUser({ id:req.user.id });
  if (!user) return res.status(404).json({ error:'Não encontrado' });
  res.json({ id:user.id, nickname:user.nickname, email:user.email, role:user.role, plan:user.plan, status:user.status });
});

// ══════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════

app.get('/api/admin/users', adminOnly, async (req, res) => {
  const users = await db.allUsers();
  res.json(users.map(u => ({ id:u.id, nickname:u.nickname, email:u.email, role:u.role, plan:u.plan, status:u.status, createdAt:u.createdAt, subscriptionExpiry:u.subscriptionExpiry })));
});

app.patch('/api/admin/users/:id/approve', adminOnly, async (req, res) => {
  const user = await db.updateUser(req.params.id, { status:'active' });
  if (!user) return res.status(404).json({ error:'Não encontrado' });
  res.json({ message:`${user.nickname} aprovado!` });
});

app.patch('/api/admin/users/:id/ban', adminOnly, async (req, res) => {
  const user = await db.findUser({ id:req.params.id });
  if (!user) return res.status(404).json({ error:'Não encontrado' });
  if (user.role === 'admin') return res.status(403).json({ error:'Não pode banir Admin' });
  await db.updateUser(req.params.id, { status:'banned' });
  res.json({ message:`${user.nickname} suspenso.` });
});

app.patch('/api/admin/users/:id/plan', adminOnly, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error:'Plano inválido' });
  const user = await db.updateUser(req.params.id, { plan });
  if (!user) return res.status(404).json({ error:'Não encontrado' });
  res.json({ message:`Plano de ${user.nickname} → ${plan.toUpperCase()}` });
});

app.get('/api/admin/stats', adminOnly, async (req, res) => {
  const users = await db.allUsers();
  res.json({
    total:users.length, active:users.filter(u=>u.status==='active').length,
    pending:users.filter(u=>u.status==='pending').length, banned:users.filter(u=>u.status==='banned').length,
    pro:users.filter(u=>u.plan==='pro').length, elite:users.filter(u=>u.plan==='elite').length,
  });
});

// ══════════════════════════════════════════════════════
//  STRIPE
// ══════════════════════════════════════════════════════

app.post('/api/payments/stripe/create-session', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(503).json({ error:'Stripe não configurado. Adicione STRIPE_SECRET_KEY nas variáveis de ambiente.' });
  const { plan } = req.body;
  const planData = PLANS[plan];
  if (!planData || planData.priceBRL === 0) return res.status(400).json({ error:'Plano inválido' });
  try {
    const base = process.env.BASE_URL || `http://localhost:${PORT}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types:['card'], mode:'subscription',
      line_items:[{ price_data:{ currency:'brl', product_data:{ name:`WZ Championship — ${planData.name}` }, unit_amount:planData.priceBRL, recurring:{ interval:'month' } }, quantity:1 }],
      metadata:{ userId:req.user.id, plan },
      success_url:`${base}/login.html?payment=success&plan=${plan}`,
      cancel_url:`${base}/login.html?payment=cancelled`,
    });
    res.json({ url:session.url });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/payments/stripe/webhook', express.raw({ type:'application/json' }), async (req, res) => {
  if (!stripe) return res.status(200).send();
  let event;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    event = secret ? stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret) : JSON.parse(req.body);
  } catch { return res.status(400).send(); }
  if (event.type === 'checkout.session.completed') {
    const { userId, plan } = event.data.object.metadata;
    const expiry = new Date(); expiry.setMonth(expiry.getMonth()+1);
    await db.updateUser(userId, { plan, status:'active', subscriptionExpiry:expiry.toISOString() });
  }
  res.json({ received:true });
});

// ══════════════════════════════════════════════════════
//  MERCADOPAGO PIX
// ══════════════════════════════════════════════════════

app.post('/api/payments/pix/create', authMiddleware, async (req, res) => {
  if (!mpClient) return res.status(503).json({ error:'MercadoPago não configurado. Adicione MP_ACCESS_TOKEN nas variáveis de ambiente.' });
  const { plan } = req.body;
  const planData = PLANS[plan];
  if (!planData || planData.priceBRL === 0) return res.status(400).json({ error:'Plano inválido' });
  try {
    const { Payment } = require('mercadopago');
    const p = new Payment(mpClient);
    const payment = await p.create({ body:{ transaction_amount:planData.priceBRL/100, description:`WZ Championship — ${planData.name}`, payment_method_id:'pix', payer:{ email:req.user.email, first_name:req.user.nickname }, metadata:{ userId:req.user.id, plan } } });
    const pix = payment.point_of_interaction?.transaction_data;
    res.json({ paymentId:payment.id, status:payment.status, qr_code:pix?.qr_code, qr_code_base64:pix?.qr_code_base64, amount:planData.priceBRL/100, plan:planData.name });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/payments/pix/status/:paymentId', authMiddleware, async (req, res) => {
  if (!mpClient) return res.status(503).json({ error:'MercadoPago não configurado' });
  try {
    const { Payment } = require('mercadopago');
    const p = new Payment(mpClient);
    const payment = await p.get({ id:req.params.paymentId });
    if (payment.status === 'approved') {
      const { userId, plan } = payment.metadata;
      const expiry = new Date(); expiry.setMonth(expiry.getMonth()+1);
      await db.updateUser(userId, { plan, status:'active', subscriptionExpiry:expiry.toISOString() });
    }
    res.json({ status:payment.status });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ──────────────────────────────────────────────────────
app.get('/api/plans', (req, res) => res.json(PLANS));
// Root always → home.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
// Any other non-API path → serve the .html file or fallback to home.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error:'Not found' });
  const file = req.path.endsWith('.html') ? req.path.slice(1) : 'home.html';
  res.sendFile(path.join(__dirname, file), err => { if(err) res.sendFile(path.join(__dirname,'home.html')); });
});

// ── START ──
async function start() {
  if (MONGODB_URL) {
    try { await connectMongo(); } catch(e) { console.warn('[AVISO] MongoDB falhou, usando db.json local:', e.message); }
  } else {
    console.log('  ℹ MONGODB_URL não definido — usando db.json local');
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   WZ Championship Manager — v5.1        ║`);
    console.log(`  ║   http://localhost:${PORT}               ║`);
    console.log(`  ║   Admin: admin@wzchamp.gg / wzchamp2026  ║`);
    console.log(`  ║   DB: ${usesMongo ? 'MongoDB Atlas ☁' : 'db.json local 💾'}              ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
    if (!MONGODB_URL) require('child_process').exec(`start http://localhost:${PORT}/home.html`);
  });
}
start();
