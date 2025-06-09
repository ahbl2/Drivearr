const { query } = require('./db');

describe('db module', () => {
  it('should execute a query successfully', async () => {
    const result = await query('SELECT 1 as test');
    expect(result).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    await expect(query('SELECT * FROM non_existent_table')).rejects.toThrow();
  });
}); 