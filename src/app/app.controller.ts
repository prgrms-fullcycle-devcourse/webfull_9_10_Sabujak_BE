import { Request, Response } from "express";
import pool from "./db";
export const helloWorld = (req: Request, res: Response) => {
  // 서버와 연결 잘 되었는지 확인 용
  res.status(200).send("Hello world~");
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1"); // DB에 간단한 신호만 보냄
    res.status(200).send("healthCheck: OK"); // 성공하면 OK 전송
  } catch {
    res.status(500).send("healthCheck: false"); // 실패하면 에러 전송
  }
};
