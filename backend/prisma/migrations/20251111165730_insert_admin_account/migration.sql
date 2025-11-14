-- Insert admin account with username: admin, password: admin
INSERT INTO "user" ("username", "email", "firstName", "lastName", "password", "role") 
VALUES (
  'admin',
  'admin@participium.com',
  'Admin',
  'User',
  '$2b$10$mlXLWqLjuxpavH71sQlHK.jmxQazcdGxWF8z.jyKbuz5vOQKVrVIC',
  'ADMIN'
);