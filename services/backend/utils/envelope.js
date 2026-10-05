// Response envelope shared with the master template's backends:
// { success, code, message, data, meta, trace_id }.
const ok = (data, traceId, meta = {}) => ({
  success: true, code: 'OK', message: 'Request completed successfully', data, meta, trace_id: traceId
});

const failure = (code, message, traceId, meta = {}) => ({
  success: false, code, message, data: null, meta, trace_id: traceId
});

module.exports = { ok, failure };
