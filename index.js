const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const path = require("path");
require("dotenv").config();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TARGET_TEXT_CHANNEL_ID = "1354381423250772041";
const CHANNEL_ID = "1354381423250772041";
const DATA_FILE = path.join(__dirname, "weeklyData.json");

const trackedUsers = {
  "801324314057900073": "종진",
  "1354335350474149998": "반석",
  "555267722859118592": "정현",
};

const userVoiceTimers = new Map();
let weeklyData = loadWeeklyData();

function getKoreanDateTimeString() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Seoul",
    weekday: "short",
  };
  const formatter = new Intl.DateTimeFormat("ko-KR", options);
  const weekday = formatter.format(now); // 예: "수"

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${date}.${weekday}. ${hour}:${minute}`;
}

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startWeeklyResetChecker();
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.id;
  if (!trackedUsers[userId]) return;

  const isJoining = !oldState.channel && newState.channel;
  const isLeaving = oldState.channel && !newState.channel;

  const member = newState.member || oldState.member;
  const username = trackedUsers[userId];
  const textChannel = newState.guild.channels.cache.get(TARGET_TEXT_CHANNEL_ID);

  if (isJoining) {
    userVoiceTimers.set(userId, Date.now());
    const timerStr = getKoreanDateTimeString();
    textChannel?.send(
      `🎙️ ${username} 님이 음성 채널에 입장했습니다! (${timerStr})`
    );
  }

  if (isLeaving) {
    const joinTime = userVoiceTimers.get(userId);
    if (joinTime) {
      const durationMs = Date.now() - joinTime;
      const prevTotal = weeklyData.totals[userId] || 0;
      weeklyData.totals[userId] = prevTotal + durationMs;
      saveWeeklyData();

      const durationStr = formatDuration(durationMs);
      const timeStr = getKoreanDateTimeString();

      textChannel?.send(
        `👋 ${username} 님이 ${durationStr} 동안 음성 채널에 있었어요! (${timeStr})`
      );
      userVoiceTimers.delete(userId);
    }
  }
});

client.on("messageCreate", (msg) => {
  if (msg.content === "/rank") {
    const entries = Object.entries(weeklyData.totals);
    if (entries.length === 0) {
      msg.channel.send("📭 이번 주 음성 채널 기록이 없습니다.");
      return;
    }

    const sorted = entries.sort((a, b) => b[1] - a[1]);
    let rankMessage = `🏆 이번 주 음성 채널 랭킹 (${weeklyData.weekStart} 시작)\n`;

    sorted.forEach(([userId, ms], index) => {
      const name = trackedUsers[userId] || "알 수 없음";
      rankMessage += `${index + 1}. ${name} - ${formatDuration(ms)}\n`;
    });

    msg.channel.send(rankMessage);
  }
});

// 유틸 함수들

function formatDuration(ms) {
  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / 1000 / 60) % 60);
  const hr = Math.floor(ms / 1000 / 60 / 60);
  if (hr > 0) return `${hr}시간 ${min}분`;
  return `${min}분 ${sec}초`;
}

function getWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  now.setDate(now.getDate() + diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

function loadWeeklyData() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    const currentWeek = getWeekStartDate();
    if (data.weekStart === currentWeek) return data;
    backupWeeklyData(data);
  }
  return {
    weekStart: getWeekStartDate(),
    totals: {},
  };
}

function saveWeeklyData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(weeklyData, null, 2));
}

function backupWeeklyData(data) {
  const backupPath = path.join(__dirname, `backup_${data.weekStart}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
}

function startWeeklyResetChecker() {
  setInterval(() => {
    const current = getWeekStartDate();
    if (weeklyData.weekStart !== current) {
      console.log("📅 새로운 주 시작: 데이터 초기화!");
      backupWeeklyData(weeklyData);
      weeklyData = {
        weekStart: current,
        totals: {},
      };
      saveWeeklyData();
    }
  }, 1000 * 60 * 10); // 10분마다 체크
}

client.login(process.env.DISCORD_BOT_TOKEN);
