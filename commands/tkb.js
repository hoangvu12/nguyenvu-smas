module.exports = {
  name: "tkb",
  command: "!tkb",
  description: "Lấy thời khóa biểu từ SMAS",
  async execute({ api, event, smas }) {
    const message = await smas.getTimeTable();
    api.sendMessage(message, event.senderID);
  },
};
