const SMAS = require("./smas");
const login = require("facebook-chat-api");
const requireDir = require("require-dir");
const fs = require("fs");
require("dotenv").config();
const requestedUsers = {};
const Database = require("./database");

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

    api.listenMqtt(async function (err, event) {
      if (err) return console.error(err);
      if (event.type !== "message") return;
      if (event.isGroup) return;
      if (!event.body.startsWith("!")) return;

      try {
        const args = event.body.slice(1).trim().split(/ +/g);
        const command = args.shift().replace(/\./g, "_");

        if (typeof commands[command] !== "function") return;

        if (!(event.senderID in requestedUsers)) {
          requestedUsers[event.senderID] = {
            smas: new SMAS(event.senderID),
          };
        }

        const user = requestedUsers[event.senderID];

        const userFunction = commands[command];
        const parameters = { args, api, event, smas: user.smas, Database };
        await userFunction(parameters);
      } catch (err) {
        api.sendMessage(err.message, event.senderID);
      }
    });
  }
);
