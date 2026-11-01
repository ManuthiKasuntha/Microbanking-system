const db = require('../db');

const ABOUT = {
  name: 'B-Trust Microbanking System',
  version: '1.0.0',
  description: 'Professional microbanking solution',
  features: [
    'Customer account management',
    'Fixed deposit accounts',
    'Transaction processing',
    'Interest calculation',
    'Multi-branch support',
  ],
};

const rows = async (text) => (await db.query(text)).rows;

const savingPlans = () => rows('SELECT saving_plan_id, plan_type, interest, min_balance FROM savingplan ORDER BY plan_type');

const branches = () => rows('SELECT branch_id, name FROM branch ORDER BY name');

const fdPlans = () => rows('SELECT fd_plan_id, fd_options, interest FROM fdplan ORDER BY fd_options');

module.exports = { ABOUT, savingPlans, branches, fdPlans };
