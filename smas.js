const utils = require("./utils");
const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
const schedule = require("node-schedule-tz");
require("dotenv").config();

axiosCookieJarSupport(axios);

const cookieJar = new tough.CookieJar();

class SMAS {
  static async login() {
    const url = "http://smsedu.smas.vn/User/Login";
    const body = `UserName=${process.env.SMAS_USERNAME}&Password=${process.env.SMAS_PASSWORD}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    await axios.post(url, body, {
      headers,
      maxRedirects: 0,
      validateStatus: function (status) {
        return status === 302;
      },
      jar: cookieJar,
      withCredentials: true,
    });
  }

  static async updateTimeTable() {
    if (!this.loggedIn) await this.login();

    const latestFile = "./latestTimeTable.json";

    let isFileExist = await utils.checkFileExists(latestFile);
    if (!isFileExist) await utils.saveContent([], latestFile);

    const URL =
      "http://smsedu.smas.vn/Home/Dashboard?schoolID=97078&academicYearID=1871034&classID=443472548&pupilID=39772293";

    const { data } = await axios.get(URL, {
      jar: cookieJar,
      withCredentials: true,
    });

    const scheduler = JSON.parse(data.match(/scheduler = (\[.*?\])/)[1]);

    const savedTimeTable = await utils.readContent(latestFile);

    if (savedTimeTable === JSON.stringify(scheduler)) return;

    await utils.saveContent(scheduler, latestFile);

    return JSON.stringify(scheduler);
  }

  static async getTimeTable() {
    const latestFile = "./latestTimeTable.json";

    let savedTimeTable;

    let isFileExist = await utils.checkFileExists(latestFile);

    if (!isFileExist) savedTimeTable = await this.updateTimeTable();
    else savedTimeTable = await utils.readContent(latestFile);

    const timetable = {};

    const dateOfWeek = {
      2: "Thứ 2",
      3: "Thứ 3",
      4: "Thứ 4",
      5: "Thứ 5",
      6: "Thứ 6",
      7: "Thứ 7",
    };

    JSON.parse(savedTimeTable)
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

  static async getMail() {
    const latestFile = "./latestMail.json";

    let isFileExist = await utils.checkFileExists(latestFile);
    if (!isFileExist)
      await utils.saveContent({ latestMailId: "000000" }, latestFile);

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
    const savedLatestMaildId = JSON.parse(await utils.readContent(latestFile))
      .latestMailId;

    if (currentLatestMailId === savedLatestMaildId) return { newMail: false };

    await utils.saveContent({ latestMailId: currentLatestMailId }, latestFile);

    return {
      newMail: true,
      sender: currentMail.senderInfo,
      body: currentMail.content,
    };
  }

  static async schedule(callback) {
    const self = this;
    const name = "get mails";
    const rule = "*/5 * * * *";
    const timezone = "Asia/Ho_Chi_Minh";
    let j = schedule.scheduleJob(name, rule, timezone, async function () {
      await self.login();
      await self.updateTimeTable();
      const isNewEmail = await self.getMail();
      this.loggedIn = true;
      callback(isNewEmail);
    });
  }
}

module.exports = SMAS;
