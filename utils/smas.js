const schedule = require("node-schedule-tz");
const Database = require("./database");
const utils = require("../utils");
const API = require("./api");
require("dotenv").config();

class SMAS {
  constructor(senderID) {
    this.senderID = senderID;
    this.find_value = { senderID: this.senderID };
    this.credentialsProvided = false;
    this.LOGIN_RETRIES = 3;
    this.API = new API();
  }

  async updateCredentials(username, password) {
    this.username = username;
    this.password = password;

    this.API.updateOpts({ username, password });

    try {
      await this.login();
      this.credentialsProvided = true;
    } catch (err) {
      this.credentialsProvided = false;
      throw new Error("Invalid credentials");
    }
  }

  async login() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    try {
      const data = await this.API.login();

      let param = data.getStr2('<a href="', '"');
      param = utils.decodeEntities(param);

      this.homepageUrl = `http://smsedu.smas.vn${param}`;
      this.params = require("url").parse(param, {
        parseQueryString: true,
      }).query;

      this.params.homepage = this.homepageUrl;

      const params = { ...this.params };

      // this.API.params = this.paramObj;
      this.API.updateOpts({ params });
    } catch (err) {
      if (this.retried > this.LOGIN_RETRIES)
        throw new Error("Invalid credentials");
      this.login();
    }
  }

  async updateTimeTable() {
    try {
      if (!this.loggedIn) await this.login();

      const isExist = await this.isExist("timeTable");

      let savedTimeTable;

      if (!isExist) {
        savedTimeTable = [];
      } else {
        const user = await this.db_get();
        savedTimeTable = user.timeTable;
      }

      const data = await this.API.getTimeTable();

      const scheduler = JSON.parse(data.match(/scheduler = (\[.*?\])/)[1]);

      if (JSON.stringify(savedTimeTable) === JSON.stringify(scheduler)) return;

      await this.db_update({ timeTable: scheduler });

      return scheduler;
    } catch (err) {
      await this.updateTimeTable();
    }
  }

  async isCreProvided() {
    const error = new Error("Please provide credentials");
    try {
      if (!this.credentialsProvided) {
        const isExist = await this.isExist("SMAS_USERNAME");

        if (!isExist) throw error;

        const user = await this.db_get();
        this.username = user.SMAS_USERNAME || "";
        this.password = user.SMAS_PASSWORD || "";

        this.API.updateOpts({
          username: this.username,
          password: this.password,
        });

        this.credentialsProvided = true;
      }

      return true;
    } catch (err) {
      throw error;
    }
  }

  async getLatestMail() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    if (!this.loggedIn) await this.login();

    const data = await this.API.getMail();

    if (JSON.stringify(data) === "[]")
      throw new Error("Không tìm thấy mail nào!");

    const mail = data[0];

    return { sender: mail.senderInfo, body: mail.content };
  }

  async getTimeTable() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    let savedTimeTable;

    const isExist = await this.isExist("timeTable");

    if (!isExist) savedTimeTable = await this.updateTimeTable();
    else {
      const user = await this.db_get();
      savedTimeTable = user.timeTable;
    }

    const timetable = {};

    const dateOfWeek = {
      2: "Thứ 2",
      3: "Thứ 3",
      4: "Thứ 4",
      5: "Thứ 5",
      6: "Thứ 6",
      7: "Thứ 7",
    };

    savedTimeTable
      .reverse()
      .filter((schedule) => schedule.section === 2)
      .map((schedule) => {
        const date = dateOfWeek[schedule.dateOfWeek];
        if (!(date in timetable)) timetable[date] = [];
        timetable[date].push(schedule.subjectName);
      });

    let response = "";

    for (let date in timetable) {
      response += `${date}: ${timetable[date].join(", ")}\n`;
    }

    return response;
  }

  async getMail() {
    try {
      let isFileExist = await this.isExist("latestMailId");

      let savedLatestMaildId;

      if (!isFileExist) savedLatestMaildId = "000000";
      else {
        const user = await this.db_get();
        savedLatestMaildId = user.latestMailId;
      }

      const data = await this.API.getMail();

      if (JSON.stringify(data) === "[]") return { newMail: false };

      const currentMail = data[0];

      const currentLatestMailId = currentMail.historyID;

      if (currentLatestMailId === savedLatestMaildId) return { newMail: false };

      await this.db_update({
        latestMailId: currentLatestMailId,
      });

      return {
        newMail: true,
        sender: currentMail.senderInfo,
        body: currentMail.content,
      };
    } catch (err) {
      await this.getMail();
    }
  }

  async isExist(property) {
    return await Database.isExist("users", this.find_value, property);
  }

  async db_update(update_value) {
    await Database.update("users", this.find_value, update_value);
  }

  async db_get() {
    return await Database.get("users", this.find_value);
  }

  async schedule(callback) {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    const name = "get mails";
    const rule = "*/5 * * * *";
    const timezone = "Asia/Ho_Chi_Minh";
    let j = schedule.scheduleJob(
      name,
      rule,
      timezone,
      async function () {
        await this.login();
        await this.updateTimeTable();
        const isNewEmail = await this.getMail();
        this.loggedIn = true;
        console.log(`[${this.senderID}] New mail: ${isNewEmail.newMail}`);
        callback(isNewEmail);
      }.bind(this)
    );
  }
}

module.exports = SMAS;