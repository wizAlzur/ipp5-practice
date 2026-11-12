class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Тело запроса должно быть JSON-объектом.');
  }
  const text = value => typeof value === 'string' ? value.trim() : '';
  const contact = {
    username: text(body.username),
    email: text(body.email),
    telephone: { mobile: text(body.telephone?.mobile), home: text(body.telephone?.home) }
  };
  const fields = {};
  if (!contact.username || contact.username.length > 100) fields.username = 'Укажите имя от 1 до 100 символов.';
  if (contact.email && (contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))) {
    fields.email = 'Укажите корректный адрес электронной почты.';
  }
  for (const name of ['mobile', 'home']) {
    const phone = contact.telephone[name];
    const digits = phone.replace(/\D/g, '');
    if (phone && (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15 || phone.length > 40)) {
      fields[`telephone.${name}`] = 'Номер должен содержать от 7 до 15 цифр.';
    }
  }
  if (!contact.telephone.mobile && !contact.telephone.home) fields.telephone = 'Укажите хотя бы один телефон.';
  if (Object.keys(fields).length) throw new ApiError(400, 'Проверьте поля контакта.', fields);
  return contact;
}

function createContactService(repository) {
  function checkId(id) {
    if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, 'Идентификатор должен содержать 24 шестнадцатеричных символа.');
  }
  function found(contact) {
    if (!contact) throw new ApiError(404, 'Контакт не найден.');
    return contact;
  }
  return {
    list: () => repository.list(),
    create: body => repository.create(validateContact(body)),
    async get(id) { checkId(id); return found(await repository.get(id)); },
    async replace(id, body) {
      checkId(id);
      return found(await repository.replace(id, validateContact(body)));
    },
    async delete(id) {
      checkId(id);
      found(await repository.delete(id));
      return { deletedId: id };
    },
    async deleteAll() { return { deletedCount: await repository.deleteAll() }; }
  };
}

module.exports = { ApiError, createContactService };
