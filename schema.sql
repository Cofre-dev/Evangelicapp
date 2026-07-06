-- ============================================================
-- Sistema de Gestión para Iglesias Evangélicas — Base de datos
-- Motor: MySQL 8+ / MariaDB 10.4+   Charset: utf8mb4
-- Importar desde phpMyAdmin: crear BD "iglesias_app" y pegar esto
-- ============================================================

CREATE DATABASE IF NOT EXISTS iglesias_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iglesias_app;

-- ------------------------------------------------------------
-- IGLESIAS: cada iglesia es un "tenant" autónomo del sistema
-- ------------------------------------------------------------
CREATE TABLE iglesias (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre               VARCHAR(150) NOT NULL,
  logo                 VARCHAR(255) NULL,            -- ruta del archivo subido
  direccion            VARCHAR(200) NULL,
  comuna               VARCHAR(100) NOT NULL,
  region               VARCHAR(100) NOT NULL,
  visitantes_promedio  INT UNSIGNED NULL,            -- lo completa el pastor en su primer ingreso
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- USUARIOS: superadmin (iglesia_id NULL), pastor, tesorero...
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  iglesia_id             INT UNSIGNED NULL,
  nombre                 VARCHAR(120) NOT NULL,
  email                  VARCHAR(150) NOT NULL UNIQUE,
  password_hash          VARCHAR(255) NOT NULL,
  rol                    ENUM('superadmin','pastor','tesorero','secretaria','otro') NOT NULL,
  telefono               VARCHAR(30) NULL,
  debe_cambiar_password  TINYINT(1) NOT NULL DEFAULT 1,  -- fuerza el modal del primer ingreso
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_iglesia FOREIGN KEY (iglesia_id)
    REFERENCES iglesias(id) ON DELETE CASCADE,
  INDEX idx_usuarios_iglesia (iglesia_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- EVENTOS: módulo Agenda (el título viene de la lista desplegable)
-- ------------------------------------------------------------
CREATE TABLE eventos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  iglesia_id   INT UNSIGNED NOT NULL,
  tipo         ENUM('Culto','Limpieza','Reunión','Ensayo','Visita','Otro') NOT NULL,
  descripcion  VARCHAR(300) NULL,
  fecha        DATE NOT NULL,
  hora_inicio  TIME NULL,
  creado_por   INT UNSIGNED NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_iglesia FOREIGN KEY (iglesia_id)
    REFERENCES iglesias(id) ON DELETE CASCADE,
  CONSTRAINT fk_evento_usuario FOREIGN KEY (creado_por)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_eventos_iglesia_fecha (iglesia_id, fecha)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PREDICADORES invitados a un culto (confirman por correo)
-- ------------------------------------------------------------
CREATE TABLE evento_predicadores (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  evento_id  INT UNSIGNED NOT NULL,
  email      VARCHAR(150) NOT NULL,
  estado     ENUM('pendiente','confirmado','rechazado') NOT NULL DEFAULT 'pendiente',
  token      CHAR(32) NOT NULL UNIQUE,   -- enlace único de confirmación
  CONSTRAINT fk_predicador_evento FOREIGN KEY (evento_id)
    REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- MOVIMIENTOS: módulo Finanzas (ingresos y egresos)
-- ------------------------------------------------------------
CREATE TABLE movimientos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  iglesia_id   INT UNSIGNED NOT NULL,
  tipo         ENUM('ingreso','egreso') NOT NULL,
  categoria    VARCHAR(80) NOT NULL,          -- Diezmos, Ofrendas, Arriendo, Luz...
  monto        DECIMAL(12,0) NOT NULL,        -- pesos chilenos, sin decimales
  fecha        DATE NOT NULL,                 -- fecha real del movimiento
  descripcion  VARCHAR(300) NULL,
  creado_por   INT UNSIGNED NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_iglesia FOREIGN KEY (iglesia_id)
    REFERENCES iglesias(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (creado_por)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_mov_iglesia_fecha (iglesia_id, fecha),
  INDEX idx_mov_iglesia_tipo (iglesia_id, tipo)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- NOTAS: módulo de recordatorios con fecha límite
-- ------------------------------------------------------------
CREATE TABLE notas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  iglesia_id    INT UNSIGNED NOT NULL,
  usuario_id    INT UNSIGNED NOT NULL,        -- dueño de la nota
  titulo        VARCHAR(150) NOT NULL,
  contenido     TEXT NULL,
  fecha_limite  DATE NOT NULL,
  completada    TINYINT(1) NOT NULL DEFAULT 0,
  notificado    TINYINT(1) NOT NULL DEFAULT 0, -- lo marca el cron al enviar el correo
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nota_iglesia FOREIGN KEY (iglesia_id)
    REFERENCES iglesias(id) ON DELETE CASCADE,
  CONSTRAINT fk_nota_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_notas_limite (fecha_limite, notificado)
) ENGINE=InnoDB;
