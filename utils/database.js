const low = require("lowdb");
const FileAsync = require("lowdb/adapters/FileAsync");
const adapter = new FileAsync("./db.json");

class Database {
  static async initialize(fields) {
    const defaultFields = {};

    if (typeof fields === "array") {
      for (field of fields) defaultFields[field] = [];
    } else if (fields) {
      defaultFields[fields] = [];
    }

    this.db = await low(adapter);
    await this.db.defaults(defaultFields).write();
  }

  static async post(field, value) {
    await this.db
      .get(field)
      .push(value)
      .last()
      .assign({ id: Date.now().toString() })
      .write();
  }

  static async get(field, value) {
    return await this.db.get(field).find(value).value();
  }

  static async getAll(field) {
    return await this.db.get(field).value();
  }

  static async update(field, find_value, update_value) {
    await this.db.get(field).find(find_value).assign(update_value).write();
  }

  static async removeValue(field, value) {
    this.db.get(field).remove(value).write();
  }

  static async removeProperty(field, property) {
    this.db.unset(`${field}.${property}`);
  }

  static async isExist(field, value, property) {
    let response;

    if (property) {
      response = await this.get(field, value);
      response = response[property];
    } else if (!value) {
      response = await this.get(field);
    } else {
      response = await this.get(field, value);
    }

    if (!response) return false;
    return true;
  }
}

module.exports = Database;
