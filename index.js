const SMAS = require("./smas");
const login = require("facebook-chat-api");
const requireDir = require("require-dir");
const fs = require("fs");
require("dotenv").config();
let scheduleActivated = false;

// == Commands == //
const commands = requireDir("./commands");

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf-8")) },
  async (err, api) => {
    api.setOptions({
      selfListen: true,
      logLevel: "silent",
      updatePresence: false,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36",
    });

    if (!scheduleActivated) {
      const senderID = "100029483922771";

      api.sendMessage("Bắt đầu bật thông báo!", senderID);

      await SMAS.schedule(function (response) {
        console.log(response);
        if (response.newMail) {
          const message = `Người gửi: ${response.sender}\nNội dung: ${response.body}`;
          api.sendMessage(message, senderID);
        }
      });

      scheduleActivated = true;
    }

    api.listenMqtt(async function (err, event) {
      if (err) return console.error(err);
      if (event.type !== "message") return;
      // if (event.isGroup) return;
      if (!event.body.startsWith("!")) return;

      const argsArr = event.body.slice(1).trim().split(/ +/g);
      const command = argsArr.shift().replace(/\./g, "_");
      const args = argsArr.join(" ");

      if (typeof commands[command] !== "function") return;

      const userFunction = commands[command];
      const parameters = { args, api, event, SMAS };
      await userFunction(parameters);
    });
  }
);
