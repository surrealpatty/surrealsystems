// scripts/make-paid.js
// Usage: node scripts/make-paid.js <userId> [status] [months]
// Example: node scripts/make-paid.js 6 active 1

const models = require('../src/models');

async function main() {
  const userId = process.argv[2];
  const status = process.argv[3] || 'active';
  const months = parseInt(process.argv[4] || '1', 10);

  if (!userId) {
    console.error('Usage: node scripts/make-paid.js <userId> [status] [months]');
    process.exit(1);
  }

  try {
    await models.sequelize.authenticate();
    console.log('DB authenticated.');

    // compute a future currentPeriodEnd
    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // generate realistic test ids so DB NOT NULL constraints are satisfied
    const suffix = String(Date.now()).slice(-6);
    const stripeCustomerId = `cus_test_${suffix}`;
    const stripeSubscriptionId = `sub_test_${suffix}`;
    const priceId = `price_test_${suffix}`;

    // create a Billing row
    const billing = await models.Billing.create({
      userId: Number(userId),
      stripeCustomerId,
      stripeSubscriptionId,
      status,
      priceId,
      currentPeriodEnd,
    });

    console.log('Created billing record:', billing.toJSON());
  } catch (err) {
    console.error('Error creating billing record:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try {
      await models.sequelize.close();
    } catch (_) {}
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
