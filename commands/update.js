const { execute } = require("./nsfw");

module.exports = {
  name: "update",
  command: "!update <taikhoansmas> <matkhausmas>",
  description: "Cập nhật tài khoản và mật khẩu SMAS",
  async execute({ args, api, event, Database, smas }) {
    try {
      await Database.initialize("users");

      const [username, password] = args;
      const find_value = { senderID: event.senderID };
      const update_value = {
        SMAS_USERNAME: username,
        SMAS_PASSWORD: password,
        senderID: event.senderID,
      };

      const isExist = await Database.isExist("users", find_value);

      if (!isExist) await Database.post("users", update_value);
      else await Database.update("users", find_value, update_value);

      await smas.updateCredentials(username, password);

      api.sendMessage("Update thành công", event.senderID);
    } catch (err) {
      api.sendMessage(err.message, event.senderID);
    }
  },
};
