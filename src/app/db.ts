import { Pool } from "pg"; // node랑 postgresSql을 연결 해주는 라이브러리
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render/Neon 환경용

  // 만약 DATABASE_URL이 없으면 로컬 도커 설정 사용
  ...(!process.env.DATABASE_URL && {
    host: "db",
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  }),

  // Neon(프로덕션)은 SSL이 필수이고, 로컬 도커는 필요 없습니다.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export default pool;
