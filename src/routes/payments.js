// src/routes/payments.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const { User, Billing } = require('../models');

/**
 * Safe stripe initialization (do not crash at module load time if not configured).
 */
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error('Failed to initialize Stripe:', e && e.message ? e.message : e);
    stripe = null;
  }
} else {
  console.warn('STRIPE_SECRET_KEY is not configured. Stripe features are disabled.');
}

const PRICE_ID = process.env.STRIPE_PRICE_ID;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const SUCCESS_URL = (FRONTEND_URL || '') + '/profile.html?from=checkout_success';
const CANCEL_URL  = (FRONTEND_URL || '') + '/profile.html?from=checkout_cancel';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not configured. Payments endpoints will return 500 if used.');
}

/**
 * POST /api/payments/create-checkout-session
 */
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    if (!stripe || !process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Payment provider not configured' });
    }

    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user.id) }
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: { userId: String(user.id) }
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/create-portal-session
 */
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Payment provider not configured' });

    const user = await User.findByPk(req.user.id);
    if (!user || !user.stripeCustomerId) return res.status(404).json({ error: 'Customer not found' });

    const returnUrl = req.body.returnUrl || (FRONTEND_URL || '') + '/profile.html';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('create-portal-session error:', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

/**
 * webhookHandler(req,res) - expects raw body
 */
async function webhookHandler(req, res) {
  if (!stripe) {
    console.error('Stripe not configured - webhook received but stripe client missing.');
    return res.status(500).send('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured. Webhook cannot verify signatures.');
    return res.status(500).send('Webhook misconfigured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('stripe webhook signature verification failed:', err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || null;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (userId && stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

          let billing = await Billing.findOne({ where: { stripeSubscriptionId } });
          if (!billing) {
            billing = await Billing.create({
              userId: Number(userId),
              stripeCustomerId,
              stripeSubscriptionId,
              status: subscription.status,
              priceId: subscription.items?.data?.[0]?.price?.id || null,
              currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
            });
          } else {
            billing.status = subscription.status || billing.status;
            billing.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : billing.currentPeriodEnd;
            billing.priceId = subscription.items?.data?.[0]?.price?.id || billing.priceId;
            await billing.save();
          }

          const user = await User.findByPk(Number(userId));
          if (user) {
            user.stripeCustomerId = stripeCustomerId || user.stripeCustomerId;
            if (['active','trialing'].includes(subscription.status)) user.tier = 'paid';
            await user.save();
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          const billing = await Billing.findOne({ where: { stripeSubscriptionId: subId } });
          if (billing) {
            billing.status = subscription.status || billing.status;
            billing.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : billing.currentPeriodEnd;
            await billing.save();

            if (['active','trialing'].includes(subscription.status)) {
              const user = await User.findByPk(billing.userId);
              if (user && user.tier !== 'paid') { user.tier = 'paid'; await user.save(); }
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const obj = event.data.object;
        const subId = obj.id || obj.subscription;
        if (subId) {
          let subscription;
          try {
            subscription = (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') ? obj : await stripe.subscriptions.retrieve(subId);
          } catch (e) {
            subscription = obj;
          }

          const billing = await Billing.findOne({ where: { stripeSubscriptionId: subId } });
          if (billing && subscription) {
            const newStatus = subscription.status || billing.status;
            billing.status = newStatus;
            billing.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : billing.currentPeriodEnd;
            await billing.save();

            if (['canceled','incomplete_expired','past_due'].includes(newStatus)) {
              const user = await User.findByPk(billing.userId);
              if (user) { user.tier = 'free'; await user.save(); }
            } else if (['active','trialing'].includes(newStatus)) {
              const user = await User.findByPk(billing.userId);
              if (user && user.tier !== 'paid') { user.tier = 'paid'; await user.save(); }
            }
          }
        }
        break;
      }

      default:
        // ignore other events
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err && err.stack ? err.stack : err);
    return res.status(500).send('Internal server error');
  }
}

module.exports = router;
module.exports.webhookHandler = webhookHandler;
