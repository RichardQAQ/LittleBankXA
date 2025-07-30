const pool = require('./db');

async function fixCashBalance() {
  try {
    console.log('开始修复现金余额不一致问题...');
    
    // 获取用户现金余额
    const [users] = await pool.query('SELECT * FROM users WHERE id = 1');
    if (users.length === 0) {
      console.log('未找到用户数据');
      return;
    }
    
    const userCashBalance = parseFloat(users[0].cash_balance);
    console.log('User表中的现金余额:', userCashBalance);
    
    // 检查portfolio表中是否有现金资产
    const [cashAssets] = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = 1 AND asset_type = "cash" AND status = 1'
    );
    
    if (cashAssets.length === 0) {
      // 如果没有现金资产记录，创建一个新记录
      console.log('Portfolio表中没有现金资产记录，创建新记录');
      await pool.query(
        'INSERT INTO portfolio (user_id, asset_type, asset_id, quantity, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?, CURDATE(), 1)',
        [1, 'cash', 0, userCashBalance, 1]
      );
      console.log('已创建现金资产记录，金额:', userCashBalance);
    } else {
      // 如果有现金资产记录，更新它
      console.log('Portfolio表中有现金资产记录，更新记录');
      await pool.query(
        'UPDATE portfolio SET quantity = ? WHERE user_id = 1 AND asset_type = "cash" AND status = 1',
        [userCashBalance]
      );
      console.log('已更新现金资产记录，金额:', userCashBalance);
    }
    
    // 验证修复结果
    const [updatedCashAssets] = await pool.query(
      'SELECT SUM(quantity * purchase_price) as total FROM portfolio WHERE user_id = 1 AND asset_type = "cash" AND status = 1'
    );
    console.log('修复后Portfolio表中的现金总额:', updatedCashAssets[0].total);
    
    console.log('现金余额修复完成');
  } catch (error) {
    console.error('修复现金余额时出错:', error);
  } finally {
    process.exit(0);
  }
}

// 执行修复
fixCashBalance();