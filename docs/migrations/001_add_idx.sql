-- 1. 기존 field 컬럼 삭제
ALTER TABLE capsules DROP COLUMN IF EXISTS field;

-- 2. 새로운 updated_at 컬럼 추가 (데이터 형식: timestamptz)
ALTER TABLE capsules ADD COLUMN updated_at timestamptz NULL;

-- expires_at 조회할 사항이 많기 때문에 index 걸기
CREATE INDEX idx_capsules_expires_at ON capsules (expires_at);

-- 같은 캡슐(capsule_id) 내에서 닉네임(nickname) 중복 방지
CREATE UNIQUE INDEX idx_messages_capsule_id_nickname ON messages (capsule_id, nickname);

-- 특정 캡슐 내 메시지 목록 조회 성능 최적화 (정렬 포함)
CREATE INDEX idx_messages_capsule_id_id ON messages (capsule_id, id ASC);