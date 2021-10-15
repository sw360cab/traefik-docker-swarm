const fastify = require('fastify')({
  logger: true
})

fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

fastify.get('/healthz', async () => {
	return {
		uptime: process.uptime(),
		message: 'OK',
		timestamp: Date.now()
	};
});

;(async () => {
  try {
    await fastify.listen(3000,'0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();