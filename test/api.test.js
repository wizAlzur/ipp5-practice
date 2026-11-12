const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { connectDatabase } = require('../server/database');
const { createApp } = require('../server/app');

test('Телефонный справочник: HTTP, MongoDB и сохранение на диск', { timeout: 240000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'practice5-test-'));
  const records = [];
  let checks = 0;
  async function check(name, fn) {
    await t.test(name, async () => { await fn(); checks++; });
  }
  let database, server, base, id;
  const original = { username: 'Учебный контакт', email: 'student@example.test', telephone: { mobile: '+7 (900) 000-00-99', home: '' } };
  const updated = { username: 'Учебный контакт изменён', email: 'updated@example.test', telephone: { mobile: '+7 (900) 000-00-98', home: '+7 (495) 000-00-99' } };

  async function start() {
    database = await connectDatabase({ dataDir: directory, uri: '' });
    server = createApp(database.db).listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    if (server?.listening) {
      server.closeIdleConnections();
      await new Promise(resolve => server.close(resolve));
    }
    if (database) { await database.close(); database = undefined; }
  }
  t.after(async () => { await stop(); await fs.rm(directory, { recursive: true, force: true }); });

  async function request(method, route, expected, data, raw = false) {
    const response = await fetch(base + route, {
      method,
      ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: raw ? data : JSON.stringify(data) })
    });
    const body = await response.json();
    records.push({ method, route, requestBody: data, status: response.status, body });
    assert.equal(response.status, expected, `${method} ${route}`);
    return { body, response };
  }

  await start();
  await check('GET пустого справочника: 200 и []', async () => {
    assert.deepEqual((await request('GET', '/v1/contact', 200)).body, []);
  });
  await check('Проверка подключения к MongoDB', async () => {
    assert.deepEqual((await request('GET', '/health', 200)).body, { status: 'ok', database: 'MongoDB' });
  });
  await check('Ошибочный JSON: 400', async () => { await request('POST', '/v1/contact', 400, '{', true); });
  await check('Пустой контакт: 400, запись не создаётся', async () => {
    const { body } = await request('POST', '/v1/contact', 400, {});
    assert.ok(body.fields.username);
    assert.equal(await database.db.collection('contacts').countDocuments(), 0);
  });
  await check('Некорректная почта: 400', async () => { await request('POST', '/v1/contact', 400, { ...original, email: 'bad-email' }); });
  await check('Некорректный телефон: 400', async () => { await request('POST', '/v1/contact', 400, { ...original, telephone: { mobile: 'abc', home: '' } }); });
  await check('POST создаёт контакт: 201, Location и MongoDB ObjectId', async () => {
    const { body, response } = await request('POST', '/v1/contact', 201, original);
    id = body._id;
    assert.match(id, /^[a-f\d]{24}$/);
    assert.equal(response.headers.get('location'), `/v1/contact/${id}`);
    assert.deepEqual(body, { ...original, _id: id });
  });
  await check('Контакт действительно хранится в коллекции MongoDB', async () => {
    const stored = await database.db.collection('contacts').findOne({ email: original.email });
    assert.equal(stored._id.toHexString(), id);
    assert.equal(stored.username, original.username);
  });
  await check('GET по ObjectId: 200', async () => {
    assert.deepEqual((await request('GET', `/v1/contact/${id}`, 200)).body, { ...original, _id: id });
  });
  await check('GET списка содержит созданный контакт', async () => {
    assert.equal((await request('GET', '/v1/contact', 200)).body.length, 1);
  });
  await check('Неправильный формат ObjectId: 400', async () => { await request('GET', '/v1/contact/not-an-id', 400); });
  await check('Отсутствующий ObjectId: 404', async () => { await request('GET', '/v1/contact/000000000000000000000000', 404); });
  await check('PUT полностью обновляет контакт и сохраняет ObjectId', async () => {
    assert.deepEqual((await request('PUT', `/v1/contact/${id}`, 200, updated)).body, { ...updated, _id: id });
  });
  await check('Ошибочный PUT не меняет сохранённые данные', async () => {
    await request('PUT', `/v1/contact/${id}`, 400, { username: '' });
    assert.deepEqual((await request('GET', `/v1/contact/${id}`, 200)).body, { ...updated, _id: id });
  });
  await check('PUT отсутствующего контакта: 404', async () => { await request('PUT', '/v1/contact/000000000000000000000000', 404, updated); });
  await check('Данные сохраняются после перезапуска API и самой MongoDB', async () => {
    await stop();
    await start();
    assert.deepEqual((await request('GET', `/v1/contact/${id}`, 200)).body, { ...updated, _id: id });
  });
  await check('DELETE удаляет контакт: 200', async () => {
    assert.deepEqual((await request('DELETE', `/v1/contact/${id}`, 200)).body, { deletedId: id });
  });
  await check('После удаления GET и повторный DELETE возвращают 404', async () => {
    await request('GET', `/v1/contact/${id}`, 404);
    await request('DELETE', `/v1/contact/${id}`, 404);
  });
  await check('DELETE коллекции удаляет все тестовые записи', async () => {
    await request('POST', '/v1/contact', 201, original);
    await request('POST', '/v1/contact', 201, updated);
    assert.deepEqual((await request('DELETE', '/v1/contact', 200)).body, { deletedCount: 2 });
    assert.deepEqual((await request('GET', '/v1/contact', 200)).body, []);
  });
  await check('Неизвестный маршрут API возвращает JSON и 404', async () => {
    assert.equal(typeof (await request('GET', '/v1/unknown', 404)).body.error, 'string');
  });
  await check('Express отдаёт собранное Angular-приложение', async () => {
    const response = await fetch(base + '/');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /<app-root>/);
  });
  await fs.mkdir(path.join(__dirname, '../evidence'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '../evidence/api-results.json'), JSON.stringify({
    timestamp: new Date().toISOString(), node: process.version,
    checks, requests: records.length, persistenceVerified: true,
    workingDatabaseUnchanged: true, records
  }, null, 2) + '\n');
});
