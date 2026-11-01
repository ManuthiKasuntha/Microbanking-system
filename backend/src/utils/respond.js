const ok = (res, payload = {}) => res.json({ status: 'success', ...payload });

const created = (res, payload = {}) => res.status(201).json({ status: 'success', ...payload });

module.exports = { ok, created };
