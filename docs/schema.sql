-- Capsules Table
CREATE TABLE capsules (
    id             char(26)      NOT NULL,
    slug           varchar(50)   NULL,
    title          varchar(100)  NULL,
    open_at        timestamptz   NULL,
    expires_at     timestamptz   NULL,
    password_hash  varchar(255)  NULL,
    created_at     timestamptz   NULL,
    field          varchar(255)  NULL,
    CONSTRAINT PK_CAPSULES PRIMARY KEY (id),
    CONSTRAINT UK_CAPSULES_SLUG UNIQUE (slug)
);

-- Messages Table
CREATE TABLE messages (
    id          bigint        NOT NULL,
    capsule_id  char(26)      NOT NULL,
    nickname    varchar(20)   NULL,
    content     text          NULL,
    created_at  timestamptz   NULL,
    CONSTRAINT PK_MESSAGES PRIMARY KEY (id)
);

-- Foreign Key Constraints
ALTER TABLE messages 
ADD CONSTRAINT FK_MESSAGES_CAPSULE 
FOREIGN KEY (capsule_id) REFERENCES capsules (id)
ON DELETE CASCADE;