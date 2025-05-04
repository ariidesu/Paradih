import fastify from 'fastify';
import vhost from 'fastify-vhost';

import encryption from './common/plugins/encryption';
import authPlugin from './common/plugins/auth';
import mongoosePlugin from './common/plugins/mongoose';
import modelsPlugin from './common/plugins/models';

import apiApp from './plugins/api';
import battleApp from './plugins/battle';

async function main() {
  const host = fastify({ logger: true });

  await host.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
  await host.register(modelsPlugin);
  await host.register(encryption, { aesKey: process.env.AES_KEY! });
  await host.register(authPlugin);

  const apiInstance = fastify();
  apiInstance.register(apiApp);
  await host.register(vhost, {
    host: 'api.paradigm.ariidesu.moe',
    server: apiInstance.server
  });

  const battleInstance = fastify();
  battleInstance.register(battleApp);
  await host.register(vhost, {
    host: 'battle.paradigm.ariidesu.moe',
    server: battleInstance.server
  });

  await host.listen({ port: 3000, host: '0.0.0.0' });
}

main().catch(console.error);