const pool = require('../config/database');
const { sendDbError } = require('../utils/dbError');

exports.getSavingPlans = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT saving_plan_id, plan_type, interest, min_balance 
      FROM savingplan 
      ORDER BY plan_type
    `);
    
    res.json({
      status: 'success',
      saving_plans: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getBranches = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT branch_id, name 
      FROM branch 
      ORDER BY name
    `);
    
    res.json({
      status: 'success',
      branches: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getFDPlans = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT fd_plan_id, fd_options, interest 
      FROM fdplan 
      ORDER BY fd_options
    `);
    
    res.json({
      status: 'success',
      fd_plans: result.rows
    });
  } catch (error) {
    return sendDbError(res, error);
  } finally {
    client.release();
  }
};

exports.getAbout = (req, res) => {
  res.json({
    status: 'success',
    data: {
      name: 'B-Trust Microbanking System',
      version: '1.0.0',
      description: 'Professional microbanking solution',
      features: [
        'Customer account management',
        'Fixed deposit accounts',
        'Transaction processing',
        'Interest calculation',
        'Multi-branch support'
      ]
    }
  });
};
