async function main() {
  const api = `http://127.0.0.1:${process.env.PORT || 8080}/v1/contact`;
  try {
    const response = await fetch(api);
    if (!response.ok) throw new Error(`GET: HTTP ${response.status}`);
    const existing = await response.json();
    const examples = [
      { username: 'Анна Смирнова', email: 'anna@example.test', telephone: { mobile: '+7 (900) 000-00-01', home: '' } },
      { username: 'Дмитрий Волков', email: 'dmitry@example.test', telephone: { mobile: '+7 (900) 000-00-02', home: '+7 (495) 000-00-02' } },
      { username: 'Мария Соколова', email: 'maria@example.test', telephone: { mobile: '+7 (900) 000-00-03', home: '' } }
    ];
    for (const contact of examples) {
      if (existing.some(item => item.email === contact.email)) continue;
      const created = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) });
      if (!created.ok) throw new Error(`POST: HTTP ${created.status}`);
    }
    console.log('Добавлены 3 учебных контакта. Повторный запуск не создаёт дубликатов.');
  } catch (error) { throw new Error(`Сначала запустите npm start. ${error.message}`); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
