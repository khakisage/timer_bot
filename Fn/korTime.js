function getKoreanDateTimeString() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Seoul",
    weekday: "short", // 요일 (예: 월, 화, 수)
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24시간제 (true면 오전/오후)
  };
  const formatter = new Intl.DateTimeFormat("ko-KR", options);
  return formatter.format(now); // 예: "수 오후 3:15"
}

export default getKoreanDateTimeString;
