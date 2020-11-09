module.exports = async function ({ args, api, event, smas }) {
  const message = await smas.getTimeTable();
  api.sendMessage(message, event.senderID);
};
