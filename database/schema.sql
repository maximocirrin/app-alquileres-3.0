-- Database Creation
CREATE DATABASE IF NOT EXISTS prop_manager_db;
USE prop_manager_db;

-- 1. Users Table (Admin access)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Store bcrypt hash here, never plain text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Owners Table (Data from "Datos del Propietario")
CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    cbu_alias VARCHAR(100) COMMENT 'Billing info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tenants Table (Data from "Datos del Inquilino")
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Properties Table (Data from "Datos del Inmueble")
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    owner_id INT,
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
);

-- 5. Contracts Table (Linking Property, Tenant, and Financial terms)
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    current_rent DECIMAL(10, 2) NOT NULL,
    rent_due_day INT NOT NULL CHECK (rent_due_day BETWEEN 1 AND 31),
    increase_rate DECIMAL(5, 2) DEFAULT 0,
    increase_frequency_months INT DEFAULT 12,
    contract_file_url VARCHAR(255),
    notify_rent_expiry BOOLEAN DEFAULT FALSE,
    notify_punitive_interests BOOLEAN DEFAULT FALSE,
    status ENUM('Active', 'Terminated', 'Expired') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Insert a default admin user if not exists (password: admin123 - Hashed for demo purposes would be handled by app, inserting placeholder)
-- INSERT INTO users (username, email, password_hash) VALUES ('admin', 'admin@example.com', '$2b$10$EpOu....'); 
