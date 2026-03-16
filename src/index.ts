import express from "express";
import appRouter from "./app/app.route";

const app = express();

// Render 환견에서 리버스 프록시(로드밸런서)를 거쳐 들어오는 실제 클라이언트 IP를 정상적으로 식별하기 위해 단일 로드밸런서를 신뢰합니다.
// 이 설정이 없으면 모든 요청이 로드밸런서의 동일한 IP로 인식되어 rate-limit이 모든 사용자에게 동시에 적용됩니다.
app.set("trust proxy", 1);

app.use("/", appRouter);

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
