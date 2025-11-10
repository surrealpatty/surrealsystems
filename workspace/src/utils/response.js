// src/utils/response.js
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendError(res, message = 'Something went wrong', status = 500, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

module.exports = { sendSuccess, sendError };
