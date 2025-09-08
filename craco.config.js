module.exports = {
  devServer: (devServerConfig, { env, paths }) => {
    // Override the deprecated middleware setup
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      
      // Custom middleware can be added here
      return middlewares;
    };

    // Remove deprecated properties
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Additional webpack configuration if needed
      return webpackConfig;
    }
  }
};