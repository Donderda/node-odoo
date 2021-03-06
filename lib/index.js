var https = require('https'),
    jayson = require('jayson');

var Odoo = function (config) {
  config = config || {};

  this.host = config.host;
  this.port = config.port || 80;
  this.database = config.database;
  this.username = config.username;
  this.password = config.password;
};

// Connect
Odoo.prototype.connect = function (cb) {
  var params = {
    db: this.database,
    login: this.username,
    password: this.password
  };

  var json = JSON.stringify({ params: params });

  var options = {
    host: this.host,
    port: this.port,
    path: '/web/session/authenticate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': json.length
    }
  };

  var self = this;

  var req = https.request(options, function (res) {
    var response = '';

    res.setEncoding('utf8');

    res.on('data', function (chunk) {
      response += chunk;
    });

    res.on('end', function () {
      response = JSON.parse(response);

      if (response.error) {
        return cb(response.error, null);
      }

      self.uid = response.result.uid;
      self.sid = res.headers['set-cookie'][0].split(';')[0];
      self.session_id = response.result.session_id;
      self.context = response.result.user_context;

      return cb(null, response.result);
    });
  });

  req.write(json);
};

// Create record
Odoo.prototype.create = function (model, params, callback) {
  this._request('/web/dataset/call_kw', {
    kwargs: {
      context: this.context
    },
    model: model,
    method: 'create',
    args: [params]
  }, callback);
};

// Create name
Odoo.prototype.createName = function (project_id, name, callback) {
  let context = this.context;
  context.default_project_id = project_id;
  this._request('/web/dataset/call_kw', {

    kwargs: {
      context: context
    },

    model: "project.task.type",
    method: 'name_create',
    args: [name]
  }, callback);
};

// Get record
Odoo.prototype.get = function (model, id, callback) {
  this._request('/web/dataset/call', {
    model: model,
    method: 'read',
    args: [id]
  }, callback);
};

// Update record
Odoo.prototype.update = function (model, id, params, callback) {
  if (id) {
    this._request('/web/dataset/call_kw', {
      kwargs: {
        context: this.context
      },
      model: model,
      method: 'write',
      args: [[id], params]
    }, callback);
  }
};

// Update record
Odoo.prototype.createMessage = function (model, id, params, callback) {
  if (id) {
    params.message_type = "comment";
    params.context = this.context;
    this._request('/web/dataset/call_kw', {
      kwargs: params,
      model: model,
      method: 'message_post',
      args: [[id]]
    }, callback);
  }
};

// Copy record
Odoo.prototype.copy = function (model, id, callback) {
  if (id) {
    this._request('/web/dataset/call_kw', {
      kwargs: params,
      model: model,
      method: 'copy',
      args: [[id]]
    }, callback);
  }
};


// Delete record
Odoo.prototype.delete = function (model, id, callback) {
  this._request('/web/dataset/call_kw', {
    kwargs: {
      context: this.context
    },
    model: model,
    method: 'unlink',
    args: [[id]]
  }, callback);
};

// Search records
Odoo.prototype.search = function (model, params, callback) {
  this._request('/web/dataset/call_kw', {
    kwargs: {
      context: this.context
    },
    model: model,
    method: 'search',
    args: [params]
  }, callback);
};

// Search_read records
Odoo.prototype.search_read = function (model, {domain= [], fields= [], limit= 0, offset= 0, sort= ''}, callback) {
  if (!fields.length) return console.error("The search_read method doesn't support an empty fields array.");
  this._request('/web/dataset/search_read', {
    context: this.context,
    model,
    domain,
    fields,
    limit,
    offset,
    sort,
  }, callback);
};

// Added fields_get method
Odoo.prototype.fields_get = function (model, {fields= [], attributes= {}}, callback) {
  this._request('/web/dataset/call_kw', {
    kwargs: {
      context: this.context
    },
    model,
    method: 'fields_get',
    args: [fields, attributes],
  }, callback);
};

// Private functions
Odoo.prototype._request = function (path, params, callback) {
  params = params || {};

  var options = {
    host: this.host,
    port: this.port,
    path: path || '/',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': this.sid + ';'
    }
  };

  var client = jayson.client.https(options);

  client.request('call', params, function (e, err, res) {
    if (e || err) {
      return callback(e || err, null);
    }

    return callback(null, res);
  });
};

module.exports = Odoo;
