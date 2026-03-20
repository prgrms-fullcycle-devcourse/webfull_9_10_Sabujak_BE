-- Capsules Table
CREATE TABLE capsules (
    id             char(26)      NOT NULL,
    slug           varchar(50)   NULL,
    title          varchar(100)  NULL,
    open_at        timestamptz   NULL,
    expires_at     timestamptz   NULL,
    password_hash  varchar(255)  NULL,
    created_at     timestamptz   NULL,
    updated_at    timestamptz  NULL,
    CONSTRAINT PK_CAPSULES PRIMARY KEY (id),
    CONSTRAINT UK_CAPSULES_SLUG UNIQUE (slug)
);
-- expires_at 조회할 사항이 많기 때문에 index 걸기 & 캡슐 만료일 조회 성능 최적화
CREATE INDEX CONCURRENTLY idx_capsules_expires_at ON capsules (expires_at);

-- Messages Table
CREATE TABLE messages (
    id          bigint        NOT NULL,
    capsule_id  char(26)      NOT NULL,
    nickname    varchar(20)   NULL,
    content     text          NULL,
    created_at  timestamptz   NULL,
    CONSTRAINT PK_MESSAGES PRIMARY KEY (id)
);
-- 같은 캡슐(capsule_id) 내에서 닉네임(nickname) 중복 방지
CREATE UNIQUE INDEX idx_messages_capsule_id_nickname 
ON messages (capsule_id, nickname);

-- 특정 캡슐 내 메시지 목록 조회 성능 최적화 (정렬 포함)
CREATE INDEX idx_messages_capsule_id_id ON messages (capsule_id, id ASC);

-- Foreign Key Constraints
ALTER TABLE messages 
ADD CONSTRAINT FK_MESSAGES_CAPSULE 
FOREIGN KEY (capsule_id) REFERENCES capsules (id)
ON DELETE CASCADE;