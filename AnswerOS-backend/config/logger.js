const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Background badges
  bgBlue: "\x1b[44m\x1b[37m",
  bgMagenta: "\x1b[45m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgYellow: "\x1b[43m\x1b[30m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
};

const logger = {
  cloudinary: (msg, details = "") => {
    console.log(
      `${colors.bgBlue} CLOUDINARY ${colors.reset} ${colors.cyan}${msg}${colors.reset}`,
      details ? details : ""
    );
  },

  kafka: (msg, details = "") => {
    console.log(
      `${colors.bgMagenta} KAFKA ${colors.reset} ${colors.magenta}${msg}${colors.reset}`,
      details ? details : ""
    );
  },

  worker: (msg, details = "") => {
    console.log(
      `${colors.bgYellow} RAG-WORKER ${colors.reset} ${colors.yellow}${msg}${colors.reset}`,
      details ? details : ""
    );
  },

  pinecone: (msg, details = "") => {
    console.log(
      `${colors.bgGreen} PINECONE ${colors.reset} ${colors.green}${msg}${colors.reset}`,
      details ? details : ""
    );
  },

  api: (msg, details = "") => {
    console.log(
      `${colors.bgCyan} API ${colors.reset} ${colors.white}${msg}${colors.reset}`,
      details ? details : ""
    );
  },

  error: (service, msg, err = "") => {
    console.error(
      `${colors.bgRed} ${service.toUpperCase()} ERROR ${colors.reset} ${colors.red}${msg}${colors.reset}`,
      err ? err : ""
    );
  },
};

module.exports = logger;
