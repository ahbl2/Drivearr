const path = require('path');
const fs = require('fs');
const glob = require('glob');

function parseMediaFilename(filename) {
  const tvRegex = /(.*?)[. _-]+S(\d{2})E(\d{2})/i;
  const movieRegex = /(.*?)[. _-]+(?:\d{4})/;

  const tvMatch = filename.match(tvRegex);
  if (tvMatch) {
    return {
      type: 'episode',
      title: tvMatch[1].replace(/[._-]/g, ' ').trim(),
      season: parseInt(tvMatch[2]),
      episode: parseInt(tvMatch[3])
    };
  }

  const movieMatch = filename.match(movieRegex);
  if (movieMatch) {
    return {
      type: 'movie',
      title: movieMatch[1].replace(/[._-]/g, ' ').trim()
    };
  }

  return null;
}

function scanDrive(rootPath) {
  return new Promise((resolve) => {
    const supportedExtensions = ['.mp4', '.mkv', '.avi'];
    const files = glob.sync(`${rootPath}/**/*.*`, { nodir: true });
    const media = [];

    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) return;

      const filename = path.basename(file);
      const parsed = parseMediaFilename(filename);

      if (parsed) {
        parsed.path = file;
        media.push(parsed);
      }
    });

    resolve(media);
  });
}

module.exports = {
  scanDrive
};
