module.exports = async function ({ args, api, event, smas }) {
  api.sendMessage("Đang lấy tkb....", event.senderID);
  const message = await smas.getTimeTable();
  console.log(message);
  api.sendMessage(message, event.senderID);
};
