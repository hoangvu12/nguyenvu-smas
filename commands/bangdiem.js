module.exports = {
  name: "bangdiem",
  command: "!bangdiem",
  description: "Lấy bảng điểm từ SMAS",
  async execute({ api, event, smas }) {
    api.sendMessage(
      "Vui lòng đợi. (Mât từ 1-5p nếu chạy lần đầu tiên)",
      event.senderID
    );

    try {
      const learningProcess = await smas.getLearningProcess();

      api.sendMessage(learningProcess, event.senderID);
    } catch (err) {
      api.sendMessage(err.message, event.senderID);
    }
  },
};
