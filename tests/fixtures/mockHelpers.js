export function createMockRequest({
  headers = {},
  query = {},
  body = {},
  ip = '127.0.0.1',
  path = '/test',
  method = 'GET'
} = {}) {
  return {
    headers: { ...headers },
    query: { ...query },
    body: { ...body },
    ip,
    path,
    method,
    on: () => {}
  };
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    headersSent: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      res.headersSent = true;
      return res;
    },
    send(data) {
      res.body = data;
      res.headersSent = true;
      return res;
    },
    setHeader(key, val) {
      res.headers[key.toLowerCase()] = val;
    },
    set(key, val) {
      res.setHeader(key, val);
      return res;
    },
    sendStatus(code) {
      res.statusCode = code;
      res.headersSent = true;
      return res;
    },
    end(data) {
      res.body = data;
      res.headersSent = true;
      return res;
    },
    on(event, cb) {}
  };
  return res;
}
