const schedule = require("node-schedule-tz");
const Database = require("./database");
const utils = require("../utils");
const API = require("./api");
const MINUTE = 60000;
require("dotenv").config();

class SMAS {
  constructor(senderID) {
    this.senderID = senderID;
    this.userDatabaseValue = { senderID: this.senderID };
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

  async updateLearningProcess() {
    try {
      if (!this.loggedIn) await this.login();

      const savedLearningProcess = await getSpecificUserInfo(
        this.userDatabaseValue,
        "learningProcess",
        []
      );

      const data = await this.API.getLearningProcess();

      const { subjectMark: learningProcess } = JSON.parse(
        data.match(/infoLearnProcess = (.*?);/)[1]
      );

      if (
        JSON.stringify(savedLearningProcess) === JSON.stringify(learningProcess)
      )
        return;

      updateUserInfo(this.userDatabaseValue, { learningProcess });

      return learningProcess;
    } catch (err) {
      console.log(err);
      return await this.updateLearningProcess();
    }
  }

  async updateTimeTable() {
    try {
      if (!this.loggedIn) await this.login();

      const savedTimeTable = await getSpecificUserInfo(
        this.userDatabaseValue,
        "timeTable",
        []
      );

      const data = await this.API.getTimeTable();

      const scheduler = JSON.parse(data.match(/scheduler = (\[.*?\])/)[1]);

      if (JSON.stringify(savedTimeTable) === JSON.stringify(scheduler)) return;

      updateUserInfo(this.userDatabaseValue, { timeTable: scheduler });

      return scheduler;
    } catch (err) {
      return await this.updateTimeTable();
    }
  }

  async isCreProvided() {
    const error = new Error("Please provide credentials");
    try {
      if (!this.credentialsProvided) {
        const isExist = await isPropertyExist(
          this.userDatabaseValue,
          "SMAS_USERNAME"
        );

        if (!isExist) throw error;

        const user = await getUserInfo(this.userDatabaseValue);
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
      console.log(err);
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

  async getLearningProcess() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    const savedLearningProcess = await getSpecificUserInfo(
      this.userDatabaseValue,
      "learningProcess",
      this.updateLearningProcess.bind(this)
    );

    let message = "";

    savedLearningProcess.forEach((subject) => {
      let diem_thuong_xuyen = getMark(subject.listMarkM);
      let diem_giua_ky = getMark(subject.listMarkV);
      let diem_cuoi_ky = getMark(subject.listMarkP);
      let trung_binh_mon = subject.avgPointHK1
        ? subject.avgPointHK1
        : "Không có";

      message += `Môn: ${subject.subjectName}\n`;
      message += ` + Điểm thường xuyên: ${diem_thuong_xuyen}`;
      message += ` + Điểm giữa kỳ: ${diem_giua_ky}`;
      message += ` + Điểm cuối kỳ: ${diem_cuoi_ky}`;
      message += ` + Trung bình môn: ${trung_binh_mon}\n`;
      message += "\n";
    });

    return message;
  }

  async getTimeTable() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");

    const savedTimeTable = await getSpecificUserInfo(
      this.userDatabaseValue,
      "timeTable",
      this.updateTimeTable.bind(this)
    );

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
      const savedLatestMaildId = await getSpecificUserInfo(
        this.userDatabaseValue,
        "latestMailId",
        "000000"
      );

      const data = await this.API.getMail();

      if (JSON.stringify(data) === "[]") return { newMail: false };

      const currentMail = data[0];

      const currentLatestMailId = currentMail.historyID;

      if (currentLatestMailId === savedLatestMaildId) return { newMail: false };

      updateUserInfo(this.userDatabaseValue, {
        latestMailId: currentLatestMailId,
      });

      return {
        newMail: true,
        sender: currentMail.senderInfo,
        body: currentMail.content,
      };
    } catch (err) {
      return await this.getMail();
    }
  }

  async updateSchedule() {
    const isCreProvided = await this.isCreProvided();
    if (!isCreProvided) throw new Error("Please provide credentials");
    const self = this;

    setInterval(async function () {
      console.log("Start updating... " + self.senderID);
      await self.login();
      await self.updateTimeTable();
      await self.updateLearningProcess();
      await self.getMail();
    }, MINUTE * 1);
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
        await this.updateLearningProcess();
        const isNewEmail = await this.getMail();

        this.loggedIn = true;

        console.log(`[${this.senderID}] New mail: ${isNewEmail.newMail}`);

        callback(isNewEmail);
      }.bind(this)
    );
  }
}

const showMark = (marks) => {
  if (marks.every((mark) => !mark)) return "Không có\n";

  return marks.join(", ") + "\n";
};

const getMark = (array) => showMark(array.map((diem) => diem.mark));

async function isPropertyExist(userValue, property) {
  return await Database.isExist("users", userValue, property);
}

async function getSpecificUserInfo(userValue, property, defaultValue) {
  const isPropExist = await isPropertyExist(userValue, property);

  let savedDatabaseValue;

  if (!isPropExist) {
    if (typeof defaultValue === "function") {
      savedDatabaseValue = await defaultValue();
    } else {
      savedDatabaseValue = defaultValue;
    }
  } else {
    const user = await getUserInfo(userValue);
    savedDatabaseValue = user[property];
  }

  return savedDatabaseValue;
}

async function updateUserInfo(userValue, updateValue) {
  await Database.update("users", userValue, updateValue);
}

async function getUserInfo(userValue) {
  return await Database.get("users", userValue);
}

module.exports = SMAS;
