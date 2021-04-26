const mqtt = require('mqtt');
const { logger } = require('./logger');
const { webhook } = require('./webhook');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const legacy = mqtt.connect(String(process.env.LEGACY_URL), {
  username: String(process.env.LEGACY_USERNAME),
  password: String(process.env.LEGACY_PASSWORD),
});

const target = mqtt.connect(String(process.env.TARGET_URL), {
  username: String(process.env.TARGET_USERNAME),
  password: String(process.env.TARGET_PASSWORD),
});

async function main() {
  logger.info(`[SETTING] 기존 주소: ${String(process.env.LEGACY_URL)}`);
  logger.info(`[SETTING] 기존 사용자: ${String(process.env.LEGACY_USERNAME)}`);
  logger.info(
    `[SETTING] 기존 비밀번호: ${String(process.env.LEGACY_PASSWORD)}`,
  );

  logger.info(`[SETTING] 신규 주소: ${String(process.env.TARGET_URL)}`);
  logger.info(`[SETTING] 신규 사용자: ${String(process.env.TARGET_USERNAME)}`);
  logger.info(
    `[SETTING] 신규 비밀번호: ${String(process.env.TARGET_PASSWORD)}`,
  );

  logger.info(`[SETTING] 설정 주소: ${String(process.env.NEW_ADDRESS)}`);
  logger.info(`[SETTING] 설정 사용자: ${String(process.env.NEW_USERNAME)}`);
  logger.info(`[SETTING] 설정 비밀번호: ${String(process.env.NEW_PASSWORD)}`);

  legacy.on('connect', () => {
    legacy.subscribe('data/#');
    logger.info(`[LEGACY] 서버와 연결되었습니다.`);
  });

  legacy.on('error', (err) => {
    logger.info(`[LEGACY] 오류가 발생하였습니다. ${err.message}`);
  });

  target.on('connect', () => {
    target.subscribe('data/#');
    logger.info(`[TARGET] 서버와 연결되었습니다.`);
  });

  target.on('error', (err) => {
    logger.info(`[TARGET] 오류가 발생하였습니다. ${err.message}`);
  });

  legacy.on('message', async (topic, data) => {
    const kickboardId = topic.split('/')[3];
    const obj = JSON.parse(data.toString());
    if (obj.mt !== 2 || obj.sb < 10 || obj.sf === 1) return;

    try {
      await sleep(1000);
      logger.info(`[${kickboardId}] 킥보드 이전을 시작합니다.`);
      await setCredentials(kickboardId);
      logger.info(`[${kickboardId}] 신규 서버에서 응답을 대기합니다.`);
      await waitForConnect(kickboardId);
      logger.info(`[${kickboardId}] 킥보드 이전을 완료하였습니다.`);
      await webhook.send(`[${kickboardId}] 킥보드 이전을 완료하였습니다.`);
    } catch (err) {
      logger.error(`[${kickboardId}] 킥보드 이전을 실패했습니다.`);
      await webhook.send(`[${kickboardId}] 킥보드 이전을 실패했습니다.`);
    }
  });
}

async function setCredentials(kickboardId) {
  for (let i = 0; i <= 2; i++) {
    try {
      await setConfig(kickboardId, 'ip', String(process.env.NEW_ADDRESS));
      await sleep(1000);
      await setConfig(kickboardId, 'mquser', String(process.env.NEW_USERNAME));
      await sleep(1000);
      await setConfig(kickboardId, 'mqpass', String(process.env.NEW_PASSWORD));
      await sleep(1000);
    } catch (err) {
      logger.warn(`[${kickboardId}] 킥보드 응답이 없습니다. 재시도합니다.`);
    }
  }

  reboot(kickboardId);
}

async function setConfig(kickboardId, key, value, tried = false) {
  const cmd = { cmd: 'param', value: `${key},${value}` };
  legacy.publish(kickboardId, JSON.stringify(cmd));
  const config = await waitForConfig(kickboardId);
  if (config[key] === value) {
    logger.info(`[${kickboardId}] ${key} 값 -> ${value} 변경 성공`);
    return;
  }

  if (tried) {
    throw new Error(
      `[${kickboardId}] ${key} 값 ${config[key]} -> ${value} 변경 실패`,
    );
  }

  await setConfig(kickboardId, key, value, true);
}

function reboot(kickboardId) {
  const cmd = JSON.stringify({ cmd: 'restart' });
  legacy.publish(kickboardId, cmd);
  legacy.publish(kickboardId, cmd);
}

function waitForConfig(kickboardId, ms = 10000) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => reject('Wait for connect timed out after ' + ms + ' ms'),
      ms,
    );

    const func = (topic, data) => {
      const id = topic.split('/')[3];
      const options = {};
      if (kickboardId !== id) return;
      const obj = JSON.parse(data.toString());
      if (obj.mt !== 4) return;
      obj.pa.forEach(({ name, value }) => (options[name] = value));
      legacy.removeListener('message', func);
      resolve(options);
    };

    legacy.on('message', func);
  });
}

function waitForConnect(kickboardId, ms = 300000) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => reject('Wait for connect timed out after ' + ms + ' ms'),
      ms,
    );

    const func = (topic) => {
      const id = topic.split('/')[3];
      if (kickboardId !== id) return;
      target.removeListener('message', func);
      resolve();
    };

    target.on('message', func);
  });
}

main();
