const fs = require("fs");
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();
const axios = require("axios");
const uniqueFilename = require("unique-filename");

const decodeEntities = function (text) {
  return entities.decode(text);
};

const createAttachments = function (image) {
  return fs.createReadStream(image);
};

function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function htmlPreview(html) {
  fs.promises.writeFile("./index.html", html);
}

function getStr2(start, end) {
  str = this.split(start);
  str = str[1].split(end);
  return str[0];
}

async function saveContent(content, path) {
  const stringify_types = ["object", "array"];
  if (stringify_types.includes(typeof content))
    content = JSON.stringify(content);

  await fs.promises.writeFile(path, content);
}

async function readContent(path) {
  const content = await fs.promises.readFile(path, "utf-8");
  return content;
}

String.prototype.getStr2 = getStr2;

async function getStreamImage(url, opts) {
  const options = {
    method: "GET",
    url,
    responseType: "stream",
  };

  if (opts) {
    for (key in opts) {
      options[key] = opts[key];
    }
  }

  const stream = await axios(options);

  return stream.data;
}

async function downloadImage(url, path, opts) {
  let fileName;

  if (!path) {
    fileName = `${uniqueFilename("./images/nsfw")}.jpg`;
  } else {
    fileName = `${uniqueFilename(path)}.jpg`;
  }

  const writer = fs.createWriteStream(fileName);
  const options = {
    url,
    method: "GET",
    responseType: "stream",
  };

  if (opts) {
    for (key in opts) {
      options[key] = opts[key];
    }
  }

  const response = await axios(options);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", function () {
      resolve(fileName);
    });
    writer.on("error", reject);
  });
}

module.exports = {
  createAttachments,
  checkFileExists,
  htmlPreview,
  saveContent,
  readContent,
  decodeEntities,
  getStreamImage,
  downloadImage,
};
