const { ObjectId } = require('mongodb');

function createContactRepository(db) {
  const collection = db.collection('contacts');
  return {
    list: () => collection.find().sort({ username: 1, _id: 1 }).toArray(),
    get: id => collection.findOne({ _id: new ObjectId(id) }),
    async create(contact) {
      const result = await collection.insertOne(contact);
      return { ...contact, _id: result.insertedId };
    },
    replace: (id, contact) => collection.findOneAndReplace(
      { _id: new ObjectId(id) }, contact, { returnDocument: 'after' }
    ),
    async delete(id) {
      return (await collection.deleteOne({ _id: new ObjectId(id) })).deletedCount;
    },
    async deleteAll() {
      return (await collection.deleteMany({})).deletedCount;
    }
  };
}

module.exports = { createContactRepository };
