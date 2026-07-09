function errorHandler(err, _req, res, _next) {
  console.error(err);
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "File too large. Maximum size is 5 MB.";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    status = 400;
    message = "Unexpected file field. Use the 'file' field.";
  }

  res.status(status).json({ error: message });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
