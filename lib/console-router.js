var _ = require('underscore');
var FS = require('fs');
var Path = require('path');
var Express = require('express');
var Jade = require('jade');

var ConsoleRouter = module.exports = function(options) {
  var self = this;
  self.options = options || {};
  self.options.basePath = self.options.basePath || '';
  self.options.oauth_callback = self.options.oauth_callback || '';
  self.options.codegenPath = self.options.codegenPath || '/code/build/request';

  self.router = Express.Router();
  self.router.use(require('compression')());
  if (self.options.proxy === true) {
    self.router.use('/proxy', require('../routes/proxy.js'));
  }
  var codeRouter = require('../routes/code.js')();
  self.router.use('/code', codeRouter);
  codeRouter.proxy = self.options.proxy;

  var assetManager = self.options.assetManager;
  if (!assetManager) {
    assetManager = require('../asset-manager')({
      basePath: self.options.basePath,
      development: self.options.development,
    });
    if (self.options.cache) {
      self.router.use(Express.static(__dirname + '/../static', {maxAge: self.options.cache}));
    } else {
      self.router.use(Express.static(__dirname + '/../static'));
    }
  }
  var renderOpts = {
    mixpanel: self.options.mixpanel,
    isAnyAPI: self.options.any_api,
    proxyHost: self.options.proxy,
    client_ids: self.options.client_ids || {},
    oauth_callback: self.options.oauth_callback,
    basePath: self.options.basePath,
    assetPath: self.options.assetPath || self.options.basePath,
    galleryInfo: self.options.galleryInfo,
    assetManager: assetManager,
    cssIncludes: self.options.cssIncludes || [],
    jsIncludes: self.options.jsIncludes || [],
    options: {
      disableAutorefresh: self.options.disableAutorefresh,
      codegenPath: self.options.codegenPath,
      embedParameters: self.options.embedParameters,
      credentialCookie: self.options.credentialCookie,
    },
  }
  if (self.options.swagger) {
    renderOpts.specURL = self.options.basePath + '/swagger.json',
    renderOpts.options.disableSwaggerUpload = true;
    codeRouter.swagger = self.options.swagger;
    self.router.get('/swagger.json', function(req, res) {
      res.json(self.options.swagger);
    });
  }

  var jadeFile = __dirname + '/../views/portal.jade';
  var portal = Jade.compile(FS.readFileSync(jadeFile, 'utf8'), {filename: jadeFile});
  var renderConsole = function(req, res) {
    var ext = {};
    if (!renderOpts.specURL) ext.specURL = req.query.swaggerURL || '';
    res.send(Jade.renderFile(jadeFile, _.extend(ext, renderOpts)));
  };
  self.router.get('/', renderConsole);
  self.router.get('/console', renderConsole);

  if (self.options.enableEditor) {
    self.router.get('/editor', function(req, res) {
      var ext = {
        showEditor: true,
      };
      if (!renderOpts.specURL) ext.specURL = req.query.swaggerURL || '';
      res.send(Jade.renderFile(jadeFile, _.extend(ext, renderOpts)));
    })
  }

  if (self.options.strapping) {
    var Strapping = require('strapping');
    var options =  {
      basePath: self.options.basePath + '/strapping',
      output: {
        styles: self.options.strapping.css,
        settings: self.options.strapping.config,
      },
    }
    self.router.use('/strapping', Strapping(options));
  }
}
