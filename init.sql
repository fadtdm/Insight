CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

CREATE TABLE datasets (
    dataset_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dashboards (
    dashboard_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rls_rule (
    rule_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    dataset_id INT REFERENCES datasets(dataset_id),
    filter_column VARCHAR(100),
    filter_value VARCHAR(100)
);

-- Seed Dummy Data
INSERT INTO users (username, password_hash, role) VALUES 
('admin', 'hashed_pw_here', 'Admin'),
('manager1', 'hashed_pw_here', 'User');

INSERT INTO datasets (user_id, file_name, file_path) VALUES 
(1, 'm_one_global_ent_sales.csv', '/uploads/m_one_global_ent_sales.csv'),
(1, 'bizz_megah_venture_inventory.csv', '/uploads/bizz_megah_venture_inventory.csv');