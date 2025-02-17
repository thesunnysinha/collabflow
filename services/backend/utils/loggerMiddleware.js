const loggerMiddleware = (req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);

  const originalSend = res.send;
  res.send = function (body) {
    console.log('Response Body:', body);
    originalSend.call(this, body);
  };

  next();
};

module.exports = loggerMiddleware;