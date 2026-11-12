const express = require('express');
const path = require('node:path');
const { createContactRepository } = require('./contact-repository');
const { ApiError, createContactService } = require('./contact-service');

function createApp(db, { staticDir = path.join(__dirname, '../dist/contacts/browser') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  const service = createContactService(createContactRepository(db));
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', async (req, res) => res.json(await service.list()));
  router.post('/', async (req, res) => {
    const contact = await service.create(req.body);
    res.location(`/v1/contact/${contact._id}`).status(201).json(contact);
  });
  router.delete('/', async (req, res) => res.json(await service.deleteAll()));
  router.get('/:uid', async (req, res) => res.json(await service.get(req.params.uid)));
  router.put('/:uid', async (req, res) => res.json(await service.replace(req.params.uid, req.body)));
  router.delete('/:uid', async (req, res) => res.json(await service.delete(req.params.uid)));
  app.use('/v1/contact', router);
  app.use('/v1', (req, res) => res.status(404).json({ error: 'Маршрут API не найден.' }));
  app.get('/health', async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ status: 'ok', database: 'MongoDB' });
  });
  app.use(express.static(staticDir));
  app.use((req, res) => res.status(404).json({ error: 'Ресурс не найден.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос.' });
    console.error('Ошибка API:', error.message);
    res.status(500).json({ error: 'Ошибка сервера.' });
  });
  return app;
}

module.exports = { createApp };
