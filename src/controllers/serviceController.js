const { Service, User } = require('../models');

const getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    if (!title || price === undefined)
      return res.status(400).json({ error: 'Title and price required' });

    const service = await Service.create({
      title,
      description,
      price,
      userId: req.user.id
    });
    res.status(201).json({ service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

module.exports = { getAllServices, createService };
