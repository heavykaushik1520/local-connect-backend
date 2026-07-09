function success(res, data, status = 200) {
  return res.status(status).json(data);
}

function created(res, data) {
  return success(res, data, 201);
}

function error(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

module.exports = { success, created, error };
