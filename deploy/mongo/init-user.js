// MongoDB 应用账号（与 kb-core Nacos 配置一致）
db = db.getSiblingDB('knowledge_base');
db.createUser({
  user: 'mongodb',
  pwd: 'susan123',
  roles: [{ role: 'readWrite', db: 'knowledge_base' }]
});
