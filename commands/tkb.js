module.exports = async function ({ args, api, event, SMAS }) {
  api.sendMessage("Đang lấy tkb....", event.senderID);
  const message = await SMAS.getTimeTable();
  console.log(message)
  api.sendMessage(message, event.senderID);
};
