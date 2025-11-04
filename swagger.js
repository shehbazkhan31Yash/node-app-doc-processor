const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Authentication API',
      version: '1.0.0',
      description: 'API for user registration and login',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  },
  // Adjust the glob to match where your route files live
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app, mountPath = '/api-docs') {
  // Serve swagger UI
  app.use(mountPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Expose raw swagger JSON (useful for CI or other tools)
  app.get('/swagger-output.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger;

