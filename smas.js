const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
const schedule = require("node-schedule-tz");
const Database = require("./database");
require("dotenv").config();

axiosCookieJarSupport(axios);

const cookieJar = new tough.CookieJar();

class SMAS {
  constructor(senderID) {
    this.senderID = senderID;
    this.find_value = { senderID: this.senderID };
    this.credentialsProvided = false;
  }

  async updateCredentials(username, password) {
    this.username = username;
    this.password = password;

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

    const url = "http://smsedu.smas.vn/User/Login";
    const body = `UserName=${this.username}&Password=${this.password}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    try {
      await axios.post(url, body, {
        headers,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status === 302;
        },
        jar: cookieJar,
        withCredentials: true,
      });
    } catch (err) {
      throw new Error("Invalid credentials");
    }
  }

  async updateTimeTable() {
    if (!this.loggedIn) await this.login();

    const isExist = await this.isExist("timeTable");

    let savedTimeTable;

    if (!isExist) {
      savedTimeTable = [];
    } else {
      const user = await this.get();
      savedTimeTable = user.timeTable;
    }

    const URL =
      "http://smsedu.smas.vn/Home/Dashboard?schoolID=97078&academicYearID=1871034&classID=443472548&pupilID=39772293";

    const { data } = await axios.get(URL, {
      jar: cookieJar,
      withCredentials: true,
    });

    const scheduler = JSON.parse(data.match(/scheduler = (\[.*?\])/)[1]);

    if (JSON.stringify(savedTimeTable) === JSON.stringify(scheduler)) return;

    await this.update({ timeTable: scheduler });

    return scheduler;
  }

  async isCreProvided() {
    const error = new Error("Please provide credentials");
    try {
      if (!this.credentialsProvided) {
        const isExist = await this.isExist("SMAS_USERNAME");

        if (!isExist) throw error;

        const user = await this.get();
        this.username = user.SMAS_USERNAME || "";
        this.password = user.SMAS_PASSWORD || "";

        this.credentialsProvided = true;
      }

      return true;
    } catch (err) {
      throw error;
    }
  }

  async getTimeTable() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    let savedTimeTable;

    const isExist = await this.isExist("timeTable");

    if (!isExist) savedTimeTable = await this.updateTimeTable();
    else {
      const user = await this.get();
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
    let isFileExist = await this.isExist("latestMailId");

    let savedLatestMaildId;

    if (!isFileExist) savedLatestMaildId = "000000";
    else {
      const user = await this.get();
      savedLatestMaildId = user.latestMailId;
    }

    const url = "http://smsedu.smas.vn/Home/CallApi";
    const body =
      "key=%5B%22schoolID%22%2C%22pupilID%22%2C%22pageSize%22%2C%22pageNumber%22%5D&value=%5B%2297078%22%2C%2239772293%22%2C%2220%22%2C1%5D&uri=api%2Fnewmessage%2FgetNewMessage%3F&parseObject=getNewMessage";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const { data } = await axios.post(url, body, {
      headers,
      jar: cookieJar,
      withCredentials: true,
    });

    const currentMail = data[0];

    const currentLatestMailId = currentMail.historyID;

    if (currentLatestMailId === savedLatestMaildId) return { newMail: false };

    await this.update({
      latestMailId: currentLatestMailId,
    });

    return {
      newMail: true,
      sender: currentMail.senderInfo,
      body: currentMail.content,
    };
  }

  async isExist(property) {
    return await Database.isExist("users", this.find_value, property);
  }

  async update(update_value) {
    await Database.update("users", this.find_value, update_value);
  }

  async get() {
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
        callback(isNewEmail);
      }.bind(this)
    );
  }
}

module.exports = SMAS;
