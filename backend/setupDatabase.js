const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server');

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database '${process.env.DB_NAME}' created or already exists`);

    await connection.query(`USE ${process.env.DB_NAME}`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        code TEXT,
        language VARCHAR(20) DEFAULT 'javascript',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner (owner_id),
        INDEX idx_active (is_active)
      )
    `);
    console.log('Workspaces table created successfully');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_workspaces (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        workspace_id VARCHAR(36) NOT NULL,
        role ENUM('owner', 'collaborator', 'viewer') DEFAULT 'collaborator',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_workspace (user_id, workspace_id),
        INDEX idx_user (user_id),
        INDEX idx_workspace (workspace_id)
      )
    `);
    console.log('User workspaces table created successfully');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        token TEXT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at)
      )
    `);
    console.log('Sessions table created successfully');

    console.log('\nDatabase setup completed successfully!');
    console.log('You can now start the server with: npm start or node index.js');

  } catch (error) {
    console.error('Error setting up database:', error.message);
    console.error('\nPlease check your MySQL credentials in the .env file:');
    console.error('- DB_HOST');
    console.error('- DB_USER');
    console.error('- DB_PASSWORD');
    console.error('- DB_PORT');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
