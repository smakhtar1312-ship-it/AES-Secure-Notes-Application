

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/database/prismaClient');

const userA = { email: 'usera@test.com', password: 'TestPass1' };
const userB = { email: 'userb@test.com', password: 'TestPass2' };


const agentA = request.agent(app);
const agentB = request.agent(app);

let noteAId; 
let noteBId; 


beforeAll(async () => {
  await prisma.note.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  await prisma.note.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});


describe('Registration', () => {
  test('Valid registration returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userA);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(userA.email);
  });

  test('Response does NOT contain passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'check@test.com', password: 'TestPass1' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('Duplicate email returns 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userA);
    expect(res.status).toBe(409);
  });

  test('Invalid email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'TestPass1' });
    expect(res.status).toBe(400);
  });

  test('Short password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('Missing email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'TestPass1' });
    expect(res.status).toBe(400);
  });
});


describe('Login', () => {

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(userB);
  });

  test('Correct credentials for User A → 200', async () => {
    const res = await agentA.post('/api/auth/login').send(userA);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(userA.email);
  });

  test('Login response does not contain passwordHash', async () => {
    const res = await request(app).post('/api/auth/login').send(userA);
    expect(res.body.user?.passwordHash).toBeUndefined();
  });

  test('Wrong password → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  test('Unknown email → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'TestPass1' });
    expect(res.status).toBe(401);
  });

  test('Missing fields → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('User B can log in', async () => {
    const res = await agentB.post('/api/auth/login').send(userB);
    expect(res.status).toBe(200);
  });
});


describe('Auth Middleware', () => {
  test('Unauthenticated GET /api/notes → 401', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });

  test('Unauthenticated POST /api/notes → 401', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test', content: 'Test content' });
    expect(res.status).toBe(401);
  });
});


describe('Create Notes', () => {
  test('Authenticated user can create note', async () => {
    const res = await agentA
      .post('/api/notes')
      .send({ title: 'Note A', content: 'This is User A note' });
    expect(res.status).toBe(201);
    expect(res.body.note.title).toBe('Note A');
    noteAId = res.body.note.id;
  });

  test('User B creates a note', async () => {
    const res = await agentB
      .post('/api/notes')
      .send({ title: 'Note B', content: 'This is User B note' });
    expect(res.status).toBe(201);
    noteBId = res.body.note.id;
  });

  test('Empty title → 400', async () => {
    const res = await agentA
      .post('/api/notes')
      .send({ title: '', content: 'Content' });
    expect(res.status).toBe(400);
  });

  test('Missing content → 400', async () => {
    const res = await agentA
      .post('/api/notes')
      .send({ title: 'Title' });
    expect(res.status).toBe(400);
  });
});


describe('Read Notes', () => {
  test('User A can read their own notes', async () => {
    const res = await agentA.get('/api/notes');
    expect(res.status).toBe(200);
    const noteIds = res.body.notes.map((n) => n.id);
    expect(noteIds).toContain(noteAId);

    expect(noteIds).not.toContain(noteBId);
  });

  test('User A can read their own note by ID', async () => {
    const res = await agentA.get(`/api/notes/${noteAId}`);
    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe('Note A');
    expect(res.body.note.content).toBe('This is User A note');
  });


  test('User A CANNOT read User B\'s note → 403', async () => {
    const res = await agentA.get(`/api/notes/${noteBId}`);
    expect(res.status).toBe(403);
  });

  test('User B CANNOT read User A\'s note → 403', async () => {
    const res = await agentB.get(`/api/notes/${noteAId}`);
    expect(res.status).toBe(403);
  });

  test('Invalid note ID → 400', async () => {
    const res = await agentA.get('/api/notes/abc');
    expect(res.status).toBe(400);
  });

  test('Non-existent note → 404', async () => {
    const res = await agentA.get('/api/notes/99999');
    expect(res.status).toBe(404);
  });
});


describe('Update Notes', () => {
  test('User A can update their own note', async () => {
    const res = await agentA
      .put(`/api/notes/${noteAId}`)
      .send({ title: 'Updated Note A', content: 'Updated content' });
    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe('Updated Note A');
  });

 
  test('User B CANNOT update User A\'s note → 403', async () => {
    const res = await agentB
      .put(`/api/notes/${noteAId}`)
      .send({ title: 'Hacked', content: 'Hacked content' });
    expect(res.status).toBe(403);
  });

  test('Unauthenticated update → 401', async () => {
    const res = await request(app)
      .put(`/api/notes/${noteAId}`)
      .send({ title: 'Hacked', content: 'Content' });
    expect(res.status).toBe(401);
  });
});


describe('Delete Notes', () => {

  test('User B CANNOT delete User A\'s note → 403', async () => {
    const res = await agentB.delete(`/api/notes/${noteAId}`);
    expect(res.status).toBe(403);
  });

  test('Unauthenticated delete → 401', async () => {
    const res = await request(app).delete(`/api/notes/${noteAId}`);
    expect(res.status).toBe(401);
  });

  test('User A can delete their own note', async () => {
    const res = await agentA.delete(`/api/notes/${noteAId}`);
    expect(res.status).toBe(200);
  });

  test('Deleted note cannot be retrieved → 404', async () => {
    const res = await agentA.get(`/api/notes/${noteAId}`);
    expect(res.status).toBe(404);
  });
});


describe('Logout', () => {
  test('Logout succeeds', async () => {

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send(userA);

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);


    const notesRes = await agent.get('/api/notes');
    expect(notesRes.status).toBe(401);
  });
});


describe('Security Tests', () => {
  let secAgent;

  beforeAll(async () => {
    secAgent = request.agent(app);
    await secAgent.post('/api/auth/login').send(userA);
  });

  test('XSS payload in note content is stored and returned safely', async () => {
    const xssPayload = "<script>alert('xss')</script>";
    const createRes = await secAgent
      .post('/api/notes')
      .send({ title: 'XSS Test', content: xssPayload });
    expect(createRes.status).toBe(201);

    const noteId = createRes.body.note.id;
    const getRes = await secAgent.get(`/api/notes/${noteId}`);
    expect(getRes.status).toBe(200);
  
    expect(getRes.body.note.content).toBe(xssPayload);

  
    await secAgent.delete(`/api/notes/${noteId}`);
  });

  test('SQL injection attempt in note content is stored safely', async () => {
    const sqlPayload = "'; DROP TABLE users; --";
    const createRes = await secAgent
      .post('/api/notes')
      .send({ title: 'SQL Test', content: sqlPayload });
    expect(createRes.status).toBe(201);

    const noteId = createRes.body.note.id;
    const getRes = await secAgent.get(`/api/notes/${noteId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.note.content).toBe(sqlPayload);

   
    await secAgent.delete(`/api/notes/${noteId}`);
  });

  test('Invalid session token → 401', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Cookie', 'sid=invalid_session_token_12345');
    expect(res.status).toBe(401);
  });
});
