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

// ── MongoDB Schemas ──
const userSchema = new mongoose.Schema({
  id:{ type:String, unique:true },
  nickname:String, email:{ type:String, unique:true },
  passwordHash:String, role:{ type:String, default:'user' },
  plan:{ type:String, default:'free' }, status:{ type:String, default:'pending' },
  createdAt:String, stripeCustomerId:String,
  subscriptionId:String, subscriptionExpiry:String,
});

const teamSchema = new mongoose.Schema({
  id:{ type:String, unique:true },
  name:String, tag:String, color:String, logo:String,
  ownerId:String, ownerNick:String, memberLimit:Number,
  members:[{ userId:String, nickname:String, role:String }],
  createdAt:String,
}, { strict:false });

const champSchema = new mongoose.Schema({
  id:{ type:String, unique:true },
  name:String, mode:String, season:String, prize:String,
  entryFee:Number, registrationsOpen:Boolean,
  ownerId:String, ownerNick:String, createdAt:String,
}, { strict:false });

const regSchema = new mongoose.Schema({
  id:{ type:String, unique:true },
  champId:String, teamId:String, teamName:String, teamTag:String,
  status:String, fee:Number, paidAt:String, manual:Boolean,
  approvedAt:String, createdAt:String,
}, { strict:false });

let User, Team, Champ, Reg;

async function connectMongo() {
  await mongoose.connect(MONGODB_URL);
  User  = mongoose.model('User',  userSchema);
  Team  = mongoose.model('Team',  teamSchema);
  Champ = mongoose.model('Champ', champSchema);
  Reg   = mongoose.model('Reg',   regSchema);
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

// Root ALWAYS → home.html (must be before static middleware)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));

// Static files (index:false prevents Express from auto-serving index.html at /)
app.use(express.static(__dirname, { index: false }));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error:'Token necessário' });
  // Allow local dev token (offline mode)
  if (token === 'local_admin_token') {
    req.user = { id:'admin-001', nickname:'Admin', email:'admin@wzchamp.gg', role:'admin', plan:'elite' };
    return next();
  }
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

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error:'Preencha todos os campos' });
    if (newPassword.length < 6) return res.status(400).json({ error:'Nova senha: mínimo 6 caracteres' });
    const user = await db.findUser({ id:req.user.id });
    if (!user) return res.status(404).json({ error:'Usuário não encontrado' });
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ error:'Senha atual incorreta' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.updateUser(req.user.id, { passwordHash });
    res.json({ message:'Senha alterada com sucesso!' });
  } catch(e) { res.status(500).json({ error:e.message }); }
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

app.patch('/api/admin/users/:id/role', adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['admin','user'].includes(role)) return res.status(400).json({ error:'Role inválido. Use: admin ou user' });
  if (req.params.id === req.user.id) return res.status(403).json({ error:'Você não pode alterar seu próprio role' });
  const user = await db.findUser({ id:req.params.id });
  if (!user) return res.status(404).json({ error:'Não encontrado' });
  // Promote: also set plan to elite and status to active
  const update = { role };
  if (role === 'admin') { update.plan = 'elite'; update.status = 'active'; }
  const updated = await db.updateUser(req.params.id, update);
  res.json({ message: role === 'admin' ? `${updated.nickname} agora é Admin!` : `${updated.nickname} voltou para Usuário` });
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
      success_url:`${base}/login?payment=success&plan=${plan}`,
      cancel_url:`${base}/login?payment=cancelled`,
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

// Seed admin if not exists (safe to call multiple times)
app.post('/api/setup', async (req, res) => {
  try {
    const existing = await db.findUser({ id:'admin-001' });
    if (existing) return res.json({ message:'Admin já existe', email:'admin@wzchamp.gg' });
    const hash = await bcrypt.hash('wzchamp2026', 10);
    await db.createUser({
      id:'admin-001', nickname:'Admin', email:'admin@wzchamp.gg',
      passwordHash:hash, role:'admin', plan:'elite', status:'active',
      createdAt:new Date().toISOString(),
      stripeCustomerId:null, subscriptionId:null, subscriptionExpiry:null,
    });
    res.json({ message:'Admin criado!', email:'admin@wzchamp.gg', password:'wzchamp2026' });
  } catch(e) { res.status(500).json({ error:e.message }); }
});





// ══════════════════════════════════════════════════════
//  MULTER — upload de logos
// ══════════════════════════════════════════════════════
const multer = require('multer');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(null, false); // skip non-images silently
  cb(null, true);
}});
app.use('/uploads', express.static(uploadDir));

// ── DB helpers para teams/registrations (Mongo ou JSON) ──
const db2 = {
  async readTeams() {
    if (usesMongo) return Team.find().lean();
    return readDB().teams || [];
  },
  async writeTeams(teams) {
    if (usesMongo) return; // mongo é gerenciado por operações individuais
    const d = readDB(); d.teams = teams; writeDB(d);
  },
  async readRegs() {
    if (usesMongo) return Reg.find().lean();
    return readDB().registrations || [];
  },
  async writeRegs(regs) {
    if (usesMongo) return;
    const d = readDB(); d.registrations = regs; writeDB(d);
  },
  async readChamps() {
    if (usesMongo) return Champ.find().lean();
    return readDB().championships || [];
  },
  async writeChamps(champs) {
    if (usesMongo) return;
    const d = readDB(); d.championships = champs; writeDB(d);
  },
};

// TEAM LIMITS by plan
const TEAM_MEMBER_LIMIT = { free: 5, pro: 5, elite: 7 };

// ══════════════════════════════════════════════════════
//  TEAMS ROUTES
// ══════════════════════════════════════════════════════

// GET /api/teams — lista pública
app.get('/api/teams', async (req, res) => {
  res.json(await db2.readTeams());
});

// GET /api/teams/my — meu time
app.get('/api/teams/my', authMiddleware, async (req, res) => {
  const teams = await db2.readTeams();
  const team = teams.find(t => t.ownerId === req.user.id || t.members.some(m => m.userId === req.user.id));
  res.json(team || null);
});

// POST /api/teams — criar time
app.post('/api/teams', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const teams = await db2.readTeams();
    if (teams.find(t => t.ownerId === req.user.id || t.members.some(m => m.userId === req.user.id)))
      return res.status(409).json({ error: 'Você já pertence a um time' });
    const { name, tag, color } = req.body;
    if (!name || !tag) return res.status(400).json({ error: 'Nome e tag são obrigatórios' });
    if (teams.find(t => t.tag.toLowerCase() === tag.toLowerCase())) return res.status(409).json({ error: 'Tag já em uso' });
    const user = await db.findUser({ id: req.user.id });
    const logo = req.file ? `/uploads/${req.file.filename}` : '';
    const team = {
      id: `team_${Date.now()}`,
      name: name.trim(), tag: tag.trim().toUpperCase().slice(0, 5),
      color: color || '#ff6a00', logo,
      ownerId: req.user.id, ownerNick: req.user.nickname,
      memberLimit: TEAM_MEMBER_LIMIT[user?.plan || 'free'],
      members: [{ userId: req.user.id, nickname: req.user.nickname, role: 'captain' }],
      createdAt: new Date().toISOString(),
    };
    if (usesMongo) await Team.create(team);
    else { teams.push(team); await db2.writeTeams(teams); }
    res.json(team);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/teams/:id — editar time
app.patch('/api/teams/:id', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const teams = await db2.readTeams();
    const idx = teams.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Time não encontrado' });
    if (teams[idx].ownerId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Sem permissão' });
    const { name, tag, color } = req.body;
    const upd = {};
    if (name) upd.name = name.trim();
    if (tag) {
      if (teams.find((t, i) => i !== idx && t.tag.toLowerCase() === tag.toLowerCase()))
        return res.status(409).json({ error: 'Tag já em uso' });
      upd.tag = tag.trim().toUpperCase().slice(0, 5);
    }
    if (color) upd.color = color;
    if (req.file) upd.logo = `/uploads/${req.file.filename}`;
    if (usesMongo) {
      const updated = await Team.findOneAndUpdate({ id: req.params.id }, upd, { new: true }).lean();
      return res.json(updated);
    }
    Object.assign(teams[idx], upd);
    await db2.writeTeams(teams);
    res.json(teams[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/teams/:id
app.delete('/api/teams/:id', authMiddleware, async (req, res) => {
  try {
    const teams = await db2.readTeams();
    const team = teams.find(t => t.id === req.params.id);
    if (!team) return res.status(404).json({ error: 'Não encontrado' });
    if (team.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
    if (usesMongo) await Team.deleteOne({ id: req.params.id });
    else await db2.writeTeams(teams.filter(t => t.id !== req.params.id));
    res.json({ message: 'Time excluído' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/teams/:id/members — adicionar membro
app.post('/api/teams/:id/members', authMiddleware, async (req, res) => {
  try {
    const teams = await db2.readTeams();
    const idx = teams.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Time não encontrado' });
    if (teams[idx].ownerId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });
    const { nickname } = req.body;
    const target = await db.findUser({ nickname });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (teams.find(t => t.members.some(m => m.userId === target.id)))
      return res.status(409).json({ error: `${target.nickname} já pertence a um time` });
    const owner = await db.findUser({ id: req.user.id });
    const limit = TEAM_MEMBER_LIMIT[owner?.plan || 'free'];
    if (teams[idx].members.length >= limit)
      return res.status(400).json({ error: `Limite de ${limit} membros atingido` });
    const newMember = { userId: target.id, nickname: target.nickname, role: 'player' };
    if (usesMongo) {
      const updated = await Team.findOneAndUpdate({ id: req.params.id }, { $push: { members: newMember } }, { new: true }).lean();
      return res.json(updated);
    }
    teams[idx].members.push(newMember);
    await db2.writeTeams(teams);
    res.json(teams[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/teams/:id/members/:userId
app.delete('/api/teams/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const teams = await db2.readTeams();
    const idx = teams.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Não encontrado' });
    if (teams[idx].ownerId !== req.user.id && req.user.role !== 'admin' && req.user.id !== req.params.userId)
      return res.status(403).json({ error: 'Sem permissão' });
    if (req.params.userId === teams[idx].ownerId) return res.status(400).json({ error: 'Capitão não pode sair do time' });
    if (usesMongo) {
      const updated = await Team.findOneAndUpdate({ id: req.params.id }, { $pull: { members: { userId: req.params.userId } } }, { new: true }).lean();
      return res.json(updated);
    }
    teams[idx].members = teams[idx].members.filter(m => m.userId !== req.params.userId);
    await db2.writeTeams(teams);
    res.json(teams[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/teams/:id/members/:userId/role — promover/rebaixar membro
app.patch('/api/teams/:id/members/:userId/role', authMiddleware, async (req, res) => {
  try {
    const teams = await db2.readTeams();
    const idx = teams.findIndex(t => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Time não encontrado' });
    if (teams[idx].ownerId !== req.user.id) return res.status(403).json({ error: 'Apenas o capitão pode alterar permissões' });
    const { role } = req.body;
    if (!['manager','player'].includes(role)) return res.status(400).json({ error: 'Role inválido. Use: manager ou player' });
    if (req.params.userId === teams[idx].ownerId) return res.status(400).json({ error: 'Não pode alterar o role do capitão' });
    if (usesMongo) {
      const updated = await Team.findOneAndUpdate(
        { id: req.params.id, 'members.userId': req.params.userId },
        { $set: { 'members.$.role': role } },
        { new: true }
      ).lean();
      return res.json(updated);
    }
    const mi = teams[idx].members.findIndex(m => m.userId === req.params.userId);
    if (mi < 0) return res.status(404).json({ error: 'Membro não encontrado' });
    teams[idx].members[mi].role = role;
    await db2.writeTeams(teams);
    res.json(teams[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
//  CHAMPIONSHIPS ROUTES (público)
// ══════════════════════════════════════════════════════

app.get('/api/championships', async (req, res) => {
  try {
    const champs = await db2.readChamps();
    const allRegs = await db2.readRegs();
    const enriched = champs.map(c => ({
      ...c,
      registrationCount: allRegs.filter(r => r.champId === c.id).length,
    }));
    res.json(enriched);
  } catch { res.json(await db2.readChamps()); }
});

app.post('/api/championships', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!['admin','pro','elite'].includes(user.plan) && user.role !== 'admin')
      return res.status(403).json({ error: 'Plano PRO ou ELITE necessário' });
    const { name, mode, season, prize, entryFee, registrationsOpen, scheduledAt, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
    const champ = {
      id: `champ_${Date.now()}`, name, mode: mode || 'resurgence',
      season: season || 'Season 1', prize: prize || '',
      entryFee: parseInt(entryFee) || 0, registrationsOpen: registrationsOpen !== false,
      ownerId: user.id, ownerNick: user.nickname, createdAt: new Date().toISOString(),
    };
    if (usesMongo) await Champ.create(champ);
    else { const c = await db2.readChamps(); c.push(champ); await db2.writeChamps(c); }
    res.json(champ);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/championships/:id/registrations
app.get('/api/championships/:id/registrations', async (req, res) => {
  const regs = (await db2.readRegs()).filter(r => r.champId === req.params.id);
  const teams = await db2.readTeams();
  res.json(regs.map(r => ({ ...r, team: teams.find(t => t.id === r.teamId) || null })));
});

// POST /api/championships/:id/register — inscrever time
app.post('/api/championships/:id/register', authMiddleware, async (req, res) => {
  try {
    const champs = await db2.readChamps();
    const champ = champs.find(c => c.id === req.params.id);
    if (!champ) return res.status(404).json({ error: 'Campeonato não encontrado' });
    if (!champ.registrationsOpen) return res.status(400).json({ error: 'Inscrições fechadas' });
    const teams = await db2.readTeams();
    const team = teams.find(t => t.ownerId === req.user.id || t.members.some(m => m.userId === req.user.id));
    if (!team) return res.status(400).json({ error: 'Você não tem time. Crie um time primeiro.' });
    const regs = await db2.readRegs();
    if (regs.find(r => r.champId === champ.id && r.teamId === team.id))
      return res.status(409).json({ error: 'Time já inscrito neste campeonato' });
    const fee = champ.entryFee || 0;
    const reg = {
      id: `reg_${Date.now()}`, champId: champ.id, teamId: team.id,
      teamName: team.name, teamTag: team.tag,
      status: fee > 0 ? 'pending_payment' : 'approved',
      fee, paidAt: null, createdAt: new Date().toISOString(),
    };
    if (usesMongo) await Reg.create(reg);
    else { regs.push(reg); await db2.writeRegs(regs); }
    if (fee > 0) {
      const base = process.env.BASE_URL || `http://localhost:${PORT}`;
      if (stripe && req.body.method === 'stripe') {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'], mode: 'payment',
          line_items: [{ price_data: { currency: 'brl', product_data: { name: `Inscrição: ${champ.name} — ${team.name}` }, unit_amount: fee }, quantity: 1 }],
          metadata: { regId: reg.id },
          success_url: `${base}/teams?payment=success`,
          cancel_url: `${base}/teams?payment=cancelled`,
        });
        return res.json({ reg, paymentUrl: session.url, method: 'stripe' });
      }
      if (mpClient && req.body.method === 'pix') {
        const { Payment } = require('mercadopago');
        const p = new Payment(mpClient);
        const payment = await p.create({ body: {
          transaction_amount: fee / 100, description: `Inscrição: ${champ.name}`,
          payment_method_id: 'pix',
          payer: { email: req.user.email, first_name: req.user.nickname },
          metadata: { regId: reg.id },
        }});
        const pix = payment.point_of_interaction?.transaction_data;
        return res.json({ reg, method: 'pix', paymentId: payment.id, qr_code: pix?.qr_code, qr_code_base64: pix?.qr_code_base64, amount: fee / 100 });
      }
      return res.json({ reg, requiresPayment: true, fee });
    }
    res.json({ reg, message: 'Inscrito com sucesso!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/championships/:id/registrations/:regId
app.patch('/api/championships/:id/registrations/:regId', authMiddleware, async (req, res) => {
  try {
    const champs = await db2.readChamps();
    const champ = champs.find(c => c.id === req.params.id);
    if (!champ) return res.status(404).json({ error: 'Campeonato não encontrado' });
    if (champ.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const upd = { status, ...(status === 'approved' ? { approvedAt: new Date().toISOString() } : {}) };
    if (usesMongo) {
      const updated = await Reg.findOneAndUpdate({ id: req.params.regId }, upd, { new: true }).lean();
      return res.json(updated);
    }
    const regs = await db2.readRegs();
    const idx = regs.findIndex(r => r.id === req.params.regId);
    if (idx < 0) return res.status(404).json({ error: 'Inscrição não encontrada' });
    Object.assign(regs[idx], upd);
    await db2.writeRegs(regs);
    res.json(regs[idx]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/championships/:id/teams/manual
app.post('/api/championships/:id/teams/manual', authMiddleware, async (req, res) => {
  try {
    const champs = await db2.readChamps();
    const champ = champs.find(c => c.id === req.params.id);
    if (!champ) return res.status(404).json({ error: 'Campeonato não encontrado' });
    if (champ.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
    const teams = await db2.readTeams();
    const { query } = req.body;
    const team = teams.find(t => t.name.toLowerCase() === query?.toLowerCase() || t.tag.toLowerCase() === query?.toLowerCase());
    if (!team) return res.status(404).json({ error: `Time "${query}" não encontrado` });
    const regs = await db2.readRegs();
    if (regs.find(r => r.champId === champ.id && r.teamId === team.id))
      return res.status(409).json({ error: 'Time já inscrito' });
    const reg = {
      id: `reg_${Date.now()}`, champId: champ.id, teamId: team.id,
      teamName: team.name, teamTag: team.tag,
      status: 'approved', fee: 0, paidAt: null, manual: true,
      createdAt: new Date().toISOString(),
    };
    if (usesMongo) await Reg.create(reg);
    else { regs.push(reg); await db2.writeRegs(regs); }
    res.json({ reg, team });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/payments/reg/pix/status/:paymentId — confirmar pagamento Pix de inscrição
app.get('/api/payments/reg/pix/status/:paymentId', authMiddleware, async (req, res) => {
  if (!mpClient) return res.status(503).json({ error: 'MercadoPago não configurado' });
  try {
    const { Payment } = require('mercadopago');
    const p = new Payment(mpClient);
    const payment = await p.get({ id: req.params.paymentId });
    if (payment.status === 'approved') {
      const regId = payment.metadata?.regId;
      if (regId) {
        const regs = db2.readRegs();
        const idx = regs.findIndex(r => r.id === regId);
        if (idx >= 0) { regs[idx].status = 'approved'; regs[idx].paidAt = new Date().toISOString(); db2.writeRegs(regs); }
      }
    }
    res.json({ status: payment.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
//  ADMIN — RESET PASSWORD
// ══════════════════════════════════════════════════════
app.patch('/api/admin/users/:id/reset-password', adminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Senha mínima: 6 caracteres' });
    const user = await db.findUser({ id: req.params.id });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.updateUser(req.params.id, { passwordHash });
    res.json({ message: `Senha de ${user.nickname} redefinida com sucesso!` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
//  AI SCORING — Gemini Vision
// ══════════════════════════════════════════════════════
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.post('/api/ai/score-screenshot', adminOnly, upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY não configurada' });

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imageData = fs.readFileSync(req.file.path);
    const base64 = imageData.toString('base64');
    const mimeType = req.file.mimetype;

    const prompt = `Analise esta imagem de resultado de partida do Call of Duty Warzone.
Extraia os dados de cada time/jogador visível na tela de resultado.
Retorne SOMENTE um JSON válido, sem markdown, sem explicação, no formato:
{
  "results": [
    { "placement": 1, "team_name": "NOME DO TIME ou TAG", "kills": 5 },
    { "placement": 2, "team_name": "...", "kills": 3 }
  ]
}
Se não conseguir identificar algum campo, use null.
Extraia TODOS os times/jogadores visíveis na tela.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64 } }
    ]);

    const text = result.response.text().trim();
    // Remove markdown code blocks if present
    const jsonStr = text.replace(/^```json?\n?/,'').replace(/\n?```$/,'').trim();
    const parsed = JSON.parse(jsonStr);

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json(parsed);
  } catch(e) {
    fs.unlink(req.file?.path || '', () => {});
    res.status(500).json({ error: e.message });
  }
});

// ── START ──
async function start() {
  if (MONGODB_URL) {
    try { await connectMongo(); } catch(e) { console.warn('[AVISO] MongoDB falhou, usando db.json local:', e.message); }
  } else {
    console.log('  ℹ MONGODB_URL não definido — usando db.json local');
  }
// ── Clean URL routing ──
// Root → home
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));

// Maps clean slugs to HTML files
const PAGE_MAP = {
  'home':         'home.html',
  'login':        'login.html',
  'index':        'index.html',
  'teams':        'teams.html',
  'admin':        'admin.html',
  'overlay':      'overlay.html',
  'overlay-maps': 'overlay-maps.html',
  'profile':      'profile.html',
};

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  // Serve as-is if already has extension (backwards compat)
  if (req.path.match(/\.[a-z]+$/i)) {
    return res.sendFile(path.join(__dirname, req.path.slice(1)), err => {
      if (err) res.sendFile(path.join(__dirname, 'home.html'));
    });
  }
  // Clean URL: /login → login.html
  const slug = req.path.slice(1).toLowerCase();
  const file = PAGE_MAP[slug] || (slug + '.html');
  res.sendFile(path.join(__dirname, file), err => {
    if (err) res.sendFile(path.join(__dirname, 'home.html'));
  });
});
// Global error handler — always returns JSON (catches multer errors, etc.)
app.use((err, req, res, next) => {
  console.error('[ERR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Arquivo muito grande (max 10MB)' });
  if (err.message === 'Apenas imagens') return res.status(400).json({ error: 'Apenas imagens são permitidas' });
  res.status(500).json({ error: err.message || 'Erro interno' });
});
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
